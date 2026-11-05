[CmdletBinding()]
param(
    [ValidateSet("Discover", "Tree", "Read", "Execute", "Encode")]
    [string]$Action = "Discover",
    [ValidateSet("Wrapped", "Interactive")]
    [string]$InputMode = "Wrapped",
    [string]$Code,
    [string]$CodeFile,
    [int]$VirtuosProcessId = 0,
    [int]$TimeoutSeconds = 30,
    [int]$MaxReadCharacters = 200000,
    [int]$TreeDepth = 8,
    [switch]$Json,
    [switch]$RequireReadyPrompt,
    [switch]$KeepClipboard
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

if (-not ("VirtuosTerminalBridge.NativeMethods" -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

namespace VirtuosTerminalBridge
{
    public sealed class WindowInfo
    {
        public IntPtr Handle { get; set; }
        public int ProcessId { get; set; }
        public string Title { get; set; }
        public string ClassName { get; set; }
        public bool Visible { get; set; }
        public long Area { get; set; }
    }

    public static class NativeMethods
    {
        private const uint INPUT_KEYBOARD = 1;
        private const uint KEYEVENTF_KEYUP = 0x0002;
        private const uint KEYEVENTF_UNICODE = 0x0004;
        private const ushort VK_RETURN = 0x0D;

        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [StructLayout(LayoutKind.Sequential)]
        private struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct INPUT
        {
            public uint Type;
            public INPUTUNION Data;
        }

        [StructLayout(LayoutKind.Explicit)]
        private struct INPUTUNION
        {
            [FieldOffset(0)] public KEYBDINPUT Keyboard;
            // INPUT's native union is sized by MOUSEINPUT, which is larger than
            // KEYBDINPUT on 64-bit Windows. Without this member Marshal.SizeOf
            // reports 32 instead of the required 40 bytes and SendInput fails
            // with ERROR_INVALID_PARAMETER.
            [FieldOffset(0)] public MOUSEINPUT Mouse;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct KEYBDINPUT
        {
            public ushort VirtualKey;
            public ushort ScanCode;
            public uint Flags;
            public uint Time;
            public UIntPtr ExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct MOUSEINPUT
        {
            public int Dx;
            public int Dy;
            public uint MouseData;
            public uint Flags;
            public uint Time;
            public UIntPtr ExtraInfo;
        }

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        private static extern int GetWindowTextW(IntPtr hWnd, StringBuilder text, int maxCount);

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        private static extern int GetClassNameW(IntPtr hWnd, StringBuilder className, int maxCount);

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

        [DllImport("user32.dll")]
        private static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool BringWindowToTop(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int command);

        [DllImport("user32.dll")]
        public static extern bool IsIconic(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint SendInput(uint inputCount, INPUT[] inputs, int inputSize);

        public static int GetWindowProcessId(IntPtr hWnd)
        {
            uint processId;
            GetWindowThreadProcessId(hWnd, out processId);
            return unchecked((int)processId);
        }

        public static List<WindowInfo> GetTopLevelWindows(int processId)
        {
            var result = new List<WindowInfo>();
            EnumWindows(delegate(IntPtr hWnd, IntPtr ignored)
            {
                uint ownerProcessId;
                GetWindowThreadProcessId(hWnd, out ownerProcessId);
                if (ownerProcessId != unchecked((uint)processId))
                    return true;

                var title = new StringBuilder(2048);
                var className = new StringBuilder(512);
                GetWindowTextW(hWnd, title, title.Capacity);
                GetClassNameW(hWnd, className, className.Capacity);

                RECT rect;
                long area = 0;
                if (GetWindowRect(hWnd, out rect))
                    area = Math.Max(0, rect.Right - rect.Left) * (long)Math.Max(0, rect.Bottom - rect.Top);

                result.Add(new WindowInfo
                {
                    Handle = hWnd,
                    ProcessId = processId,
                    Title = title.ToString(),
                    ClassName = className.ToString(),
                    Visible = IsWindowVisible(hWnd),
                    Area = area
                });
                return true;
            }, IntPtr.Zero);
            return result;
        }

        private static void SendKeyboardInputs(INPUT[] inputs)
        {
            uint sent = SendInput(unchecked((uint)inputs.Length), inputs, Marshal.SizeOf(typeof(INPUT)));
            if (sent != inputs.Length)
                throw new Win32Exception(Marshal.GetLastWin32Error(), "SendInput did not deliver every keyboard event.");
        }

        public static void SendUnicodeText(string text)
        {
            const int characterChunkSize = 128;
            for (int offset = 0; offset < text.Length; offset += characterChunkSize)
            {
                int characterCount = Math.Min(characterChunkSize, text.Length - offset);
                var inputs = new INPUT[characterCount * 2];
                for (int index = 0; index < characterCount; index++)
                {
                    ushort character = text[offset + index];
                    inputs[index * 2] = new INPUT
                    {
                        Type = INPUT_KEYBOARD,
                        Data = new INPUTUNION
                        {
                            Keyboard = new KEYBDINPUT { ScanCode = character, Flags = KEYEVENTF_UNICODE }
                        }
                    };
                    inputs[index * 2 + 1] = new INPUT
                    {
                        Type = INPUT_KEYBOARD,
                        Data = new INPUTUNION
                        {
                            Keyboard = new KEYBDINPUT { ScanCode = character, Flags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP }
                        }
                    };
                }
                SendKeyboardInputs(inputs);
            }
        }

        public static void SendEnter()
        {
            var inputs = new INPUT[2];
            inputs[0] = new INPUT
            {
                Type = INPUT_KEYBOARD,
                Data = new INPUTUNION { Keyboard = new KEYBDINPUT { VirtualKey = VK_RETURN } }
            };
            inputs[1] = new INPUT
            {
                Type = INPUT_KEYBOARD,
                Data = new INPUTUNION { Keyboard = new KEYBDINPUT { VirtualKey = VK_RETURN, Flags = KEYEVENTF_KEYUP } }
            };
            SendKeyboardInputs(inputs);
        }
    }
}
"@
}

function ConvertTo-Base64Utf8 {
    param([Parameter(Mandatory = $true)][string]$Text)
    [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Text))
}

function New-BridgeEnvelope {
    param(
        [Parameter(Mandatory = $true)][string]$PythonCode,
        [Parameter(Mandatory = $true)][ValidateSet("Wrapped", "Interactive")][string]$Mode
    )

    $token = [Guid]::NewGuid().ToString("N")
    $beginMarker = "__VBRIDGE_BEGIN_${token}__"
    $successMarker = "__VBRIDGE_STATUS_${token}__:OK"
    $errorMarker = "__VBRIDGE_STATUS_${token}__:ERROR"
    $endMarker = "__VBRIDGE_END_${token}__"
    if ($Mode -eq "Wrapped") {
        $payload = ConvertTo-Base64Utf8 -Text $PythonCode
        $wrapper = @"
import base64 as __vb_b64, traceback as __vb_traceback
print('$beginMarker', flush=True)
try:
    exec(compile(__vb_b64.b64decode('$payload'), '<virtuos-ai-bridge>', 'exec'), globals(), globals())
except BaseException:
    __vb_traceback.print_exc()
    print('$errorMarker', flush=True)
else:
    print('$successMarker', flush=True)
finally:
    print('$endMarker', flush=True)
"@

        $wrapperPayload = ConvertTo-Base64Utf8 -Text $wrapper
        $commands = @( "exec(compile(__import__('base64').b64decode('$wrapperPayload'),'<virtuos-terminal-bridge>','exec'))" )
    }
    else {
        $normalizedCode = $PythonCode.Replace("`r`n", "`n").Replace("`r", "`n")
        $sourceLines = @($normalizedCode.Split([char]10))
        $commands = @($sourceLines)
        # A blank line finishes a trailing if/for/def/try suite in the REPL.
        # Reuse the file's trailing blank line when it already has one.
        if ($commands.Count -eq 0 -or $commands[$commands.Count - 1].Length -gt 0) {
            $commands += ""
        }
    }

    $lastVisibleCommand = $null
    if ($Mode -eq "Interactive") {
        $lastVisibleCommand = @($sourceLines | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Last 1)
        if ($lastVisibleCommand.Count -gt 0) { $lastVisibleCommand = [string]$lastVisibleCommand[0] } else { $lastVisibleCommand = $null }
    }

    [pscustomobject]@{
        Token = $token
        BeginMarker = $beginMarker
        SuccessMarker = $successMarker
        ErrorMarker = $errorMarker
        EndMarker = $endMarker
        Mode = $Mode
        Commands = $commands
        Command = if ($Mode -eq "Wrapped") { $commands[0] } else { $null }
        LastVisibleCommand = $lastVisibleCommand
    }
}

function Get-RequestedCode {
    if ($CodeFile) {
        $resolved = Resolve-Path -LiteralPath $CodeFile
        return [IO.File]::ReadAllText($resolved, [Text.Encoding]::UTF8)
    }
    if ($null -ne $Code -and $Code.Length -gt 0) { return $Code }
    throw "Execute/Encode requires -Code or -CodeFile."
}

function Get-VirtuosProcesses {
    $processes = @(Get-Process -Name "Virtuos_x64" -ErrorAction SilentlyContinue)
    foreach ($process in $processes) {
        $path = $null
        try { $path = $process.Path } catch {}
        $windows = @([VirtuosTerminalBridge.NativeMethods]::GetTopLevelWindows($process.Id))
        [pscustomobject]@{
            Process = $process
            Id = $process.Id
            Path = $path
            Windows = $windows
            VisibleWindows = @($windows | Where-Object { $_.Visible -and $_.Area -gt 0 })
        }
    }
}

function Get-VirtuosTarget {
    $allTargets = @(Get-VirtuosProcesses)
    if ($VirtuosProcessId -gt 0) {
        $target = $allTargets | Where-Object { $_.Id -eq $VirtuosProcessId } | Select-Object -First 1
        if ($null -eq $target) { throw "No Virtuos_x64 process with PID $VirtuosProcessId was found." }
    }
    else {
        $visibleTargets = @($allTargets | Where-Object { $_.VisibleWindows.Count -gt 0 })
        if ($visibleTargets.Count -eq 0) {
            $ids = ($allTargets | ForEach-Object { $_.Id }) -join ", "
            if ($ids) {
                throw "Virtuos processes were found (PID: $ids), but none has a visible top-level window. Start the normal GUI instance; a headless OVA process cannot be driven through its terminal."
            }
            throw "No Virtuos_x64 process was found. Start ISG-virtuos and open the Python terminal."
        }
        if ($visibleTargets.Count -gt 1) {
            $ids = ($visibleTargets | ForEach-Object { $_.Id }) -join ", "
            throw "More than one visible Virtuos instance was found (PID: $ids). Select one with -VirtuosProcessId."
        }
        $target = $visibleTargets[0]
    }

    $window = $target.VisibleWindows | Sort-Object Area -Descending | Select-Object -First 1
    if ($null -eq $window) { throw "Virtuos PID $($target.Id) has no visible top-level window." }

    $root = [System.Windows.Automation.AutomationElement]::FromHandle($window.Handle)
    if ($null -eq $root) {
        throw "Windows UI Automation could not access Virtuos PID $($target.Id). Run the bridge at the same elevation level as ISG-virtuos."
    }
    [pscustomobject]@{ Process = $target.Process; Window = $window; Root = $root }
}

function Get-ElementTextViaPattern {
    param([Parameter(Mandatory = $true)]$Element, [int]$MaximumCharacters = 200000)

    try {
        $patternObject = $null
        if ($Element.TryGetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern, [ref]$patternObject)) {
            $textPattern = [System.Windows.Automation.TextPattern]$patternObject
            return [pscustomobject]@{
                Text = $textPattern.DocumentRange.GetText($MaximumCharacters)
                Method = "UIAutomation.TextPattern"
            }
        }
    }
    catch {}

    try {
        $patternObject = $null
        if ($Element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$patternObject)) {
            $valuePattern = [System.Windows.Automation.ValuePattern]$patternObject
            return [pscustomobject]@{ Text = $valuePattern.Current.Value; Method = "UIAutomation.ValuePattern" }
        }
    }
    catch {}
    $null
}

function Get-ElementDescription {
    param([Parameter(Mandatory = $true)]$Element)

    try {
        $name = $Element.Current.Name
        $className = $Element.Current.ClassName
        $automationId = $Element.Current.AutomationId
        $controlType = $Element.Current.ControlType.ProgrammaticName
        $processId = $Element.Current.ProcessId
        $isOffscreen = $Element.Current.IsOffscreen
        $isKeyboardFocusable = $Element.Current.IsKeyboardFocusable
    }
    catch { return $null }

    $sample = Get-ElementTextViaPattern -Element $Element -MaximumCharacters 5000
    $sampleText = if ($null -ne $sample) { [string]$sample.Text } else { "" }
    $score = 0
    if ($className -match "(?i)PythonShell|ShellWidget|QPlainTextEdit") { $score += 140 }
    if ($name -match "(?i)python|terminal") { $score += 45 }
    if ($controlType -match "(?i)Edit|Document") { $score += 25 }
    if ($sampleText -match "Python\s+3\.") { $score += 100 }
    if ($sampleText -match "(?m)^>>>\s") { $score += 100 }
    if ($sampleText -match "(?i)OpenVirtuosApi|Convenience Import|Default Import") { $score += 60 }
    if ($null -ne $sample) { $score += 10 }
    if (-not $isOffscreen) { $score += 5 }

    $preview = [regex]::Replace($sampleText, "\r?\n", " ↵ ")
    if ($preview.Length -gt 240) { $preview = $preview.Substring(0, 240) }

    [pscustomobject]@{
        Element = $Element
        Score = $score
        Name = $name
        ClassName = $className
        AutomationId = $automationId
        ControlType = $controlType
        ProcessId = $processId
        IsOffscreen = $isOffscreen
        IsKeyboardFocusable = $isKeyboardFocusable
        ReadMethod = if ($null -ne $sample) { $sample.Method } else { $null }
        Preview = $preview
    }
}

function Find-TerminalElement {
    param([Parameter(Mandatory = $true)]$Target)

    $elements = $Target.Root.FindAll(
        [System.Windows.Automation.TreeScope]::Descendants,
        [System.Windows.Automation.Condition]::TrueCondition
    )
    $candidates = New-Object System.Collections.Generic.List[object]
    foreach ($element in $elements) {
        $description = Get-ElementDescription -Element $element
        if ($null -ne $description -and $description.Score -gt 0) { $candidates.Add($description) }
    }

    $best = $candidates | Sort-Object Score -Descending | Select-Object -First 1
    if ($null -eq $best -or $best.Score -lt 50) {
        throw "The Python terminal could not be identified through UI Automation. Open the Terminal tab and run -Action Tree to inspect the exposed Qt controls."
    }
    [pscustomobject]@{ Best = $best; Candidates = @($candidates | Sort-Object Score -Descending) }
}

function Set-ClipboardTextWithRetry {
    param([AllowEmptyString()][string]$Text)
    $lastError = $null
    for ($attempt = 0; $attempt -lt 12; $attempt++) {
        try {
            if ($Text.Length -eq 0) {
                [System.Windows.Forms.Clipboard]::Clear()
            }
            else {
                [System.Windows.Forms.Clipboard]::SetText($Text, [System.Windows.Forms.TextDataFormat]::UnicodeText)
            }
            return
        }
        catch { $lastError = $_; Start-Sleep -Milliseconds 50 }
    }
    throw "Could not write to the Windows clipboard. Run Windows PowerShell with -STA. Last error: $lastError"
}

function Get-ClipboardTextWithRetry {
    $lastError = $null
    for ($attempt = 0; $attempt -lt 12; $attempt++) {
        try {
            if ([System.Windows.Forms.Clipboard]::ContainsText()) {
                return [System.Windows.Forms.Clipboard]::GetText([System.Windows.Forms.TextDataFormat]::UnicodeText)
            }
            return ""
        }
        catch { $lastError = $_; Start-Sleep -Milliseconds 50 }
    }
    throw "Could not read the Windows clipboard. Run Windows PowerShell with -STA. Last error: $lastError"
}

function Activate-Terminal {
    param([Parameter(Mandatory = $true)]$Target, [Parameter(Mandatory = $true)]$TerminalElement)

    $windowHandle = [IntPtr]$Target.Window.Handle
    # SW_RESTORE changes a maximized window back to its stored normal position.
    # Only restore Virtuos when it is actually minimized.
    if ([VirtuosTerminalBridge.NativeMethods]::IsIconic($windowHandle)) {
        [VirtuosTerminalBridge.NativeMethods]::ShowWindow($windowHandle, 9) | Out-Null
    }
    [VirtuosTerminalBridge.NativeMethods]::BringWindowToTop($windowHandle) | Out-Null
    [VirtuosTerminalBridge.NativeMethods]::SetForegroundWindow($windowHandle) | Out-Null
    try {
        $shell = New-Object -ComObject WScript.Shell
        $shell.AppActivate($Target.Process.Id) | Out-Null
    }
    catch {}
    Start-Sleep -Milliseconds 200
    try { $TerminalElement.SetFocus() } catch {
        throw "The terminal was found but could not receive focus. Keep the Terminal tab visible and run the bridge at the same elevation as ISG-virtuos."
    }
    Start-Sleep -Milliseconds 100

    $foreground = [VirtuosTerminalBridge.NativeMethods]::GetForegroundWindow()
    $foregroundProcessId = [VirtuosTerminalBridge.NativeMethods]::GetWindowProcessId($foreground)
    if ($foregroundProcessId -ne $Target.Process.Id) {
        throw "Refusing to send keys: Virtuos PID $($Target.Process.Id) is not foreground (foreground PID: $foregroundProcessId)."
    }
}

function Read-TerminalThroughClipboard {
    param([Parameter(Mandatory = $true)]$Target, [Parameter(Mandatory = $true)]$TerminalElement)

    $oldClipboard = Get-ClipboardTextWithRetry
    try {
        Activate-Terminal -Target $Target -TerminalElement $TerminalElement
        [System.Windows.Forms.SendKeys]::SendWait("^a")
        [System.Windows.Forms.SendKeys]::SendWait("^c")
        Start-Sleep -Milliseconds 150
        $text = Get-ClipboardTextWithRetry
        [System.Windows.Forms.SendKeys]::SendWait("{END}")
        [pscustomobject]@{ Text = $text; Method = "ClipboardFallback" }
    }
    finally {
        if (-not $KeepClipboard) { Set-ClipboardTextWithRetry -Text $oldClipboard }
    }
}

function Read-Terminal {
    param(
        [Parameter(Mandatory = $true)]$Target,
        [Parameter(Mandatory = $true)]$TerminalElement,
        [switch]$AllowClipboardFallback
    )
    $result = Get-ElementTextViaPattern -Element $TerminalElement -MaximumCharacters $MaxReadCharacters
    if ($null -ne $result) { return $result }
    if ($AllowClipboardFallback) {
        return Read-TerminalThroughClipboard -Target $Target -TerminalElement $TerminalElement
    }
    $null
}

function Send-TerminalCommand {
    param(
        [Parameter(Mandatory = $true)]$Target,
        [Parameter(Mandatory = $true)]$TerminalElement,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Command
    )
    Activate-Terminal -Target $Target -TerminalElement $TerminalElement
    [VirtuosTerminalBridge.NativeMethods]::SendUnicodeText($Command)
    # Give the Qt input control enough time to consume every Unicode key-up
    # before Enter starts a potentially slow OVA operation.
    Start-Sleep -Milliseconds 250
    [VirtuosTerminalBridge.NativeMethods]::SendEnter()
}

function Get-TerminalDelta {
    param(
        [AllowEmptyString()][string]$BeforeText,
        [Parameter(Mandatory = $true)][string]$AfterText
    )

    if ($null -ne $BeforeText -and $AfterText.StartsWith($BeforeText, [StringComparison]::Ordinal)) {
        return $AfterText.Substring($BeforeText.Length)
    }

    # Some Qt accessibility providers rewrite the final prompt instead of
    # appending to it. Fall back to the text after the longest common prefix.
    $commonLength = 0
    $maximum = [Math]::Min($BeforeText.Length, $AfterText.Length)
    while ($commonLength -lt $maximum -and $BeforeText[$commonLength] -eq $AfterText[$commonLength]) {
        $commonLength++
    }
    return $AfterText.Substring($commonLength)
}

function Wait-InteractivePromptAfterCommand {
    param(
        [Parameter(Mandatory = $true)]$Target,
        [Parameter(Mandatory = $true)]$TerminalElement,
        [AllowEmptyString()][string]$BeforeText,
        [AllowEmptyString()][string]$ExpectedCommand,
        [Parameter(Mandatory = $true)][DateTime]$Deadline,
        [Parameter(Mandatory = $true)][bool]$UiAutomationReadable
    )

    $lastRead = $null
    do {
        try {
            $lastRead = Read-Terminal -Target $Target -TerminalElement $TerminalElement -AllowClipboardFallback:(-not $UiAutomationReadable)
            if ($null -ne $lastRead) {
                $delta = Get-TerminalDelta -BeforeText $BeforeText -AfterText $lastRead.Text
                $commandObserved = [string]::IsNullOrEmpty($ExpectedCommand) -or $delta.Contains($ExpectedCommand)
                $trimmed = $delta.TrimEnd()
                $promptMatch = [regex]::Match($trimmed, "(?:^|\r?\n)(?<prompt>>{3}|\.\.\.)[ \t]*\z")
                if ($commandObserved -and $promptMatch.Success) {
                    $transcript = [regex]::Replace(
                        $trimmed,
                        "(?:\r?\n)?(?:>>>|\.\.\.)[ \t]*\z",
                        ""
                    ).Trim("`r", "`n")
                    $hasPythonError = [regex]::IsMatch(
                        $transcript,
                        "(?m)^Traceback \(most recent call last\):|^[A-Za-z_][A-Za-z0-9_.]*(?:Error|Exception):"
                    )
                    return [pscustomobject]@{
                        TimedOut = $false
                        PythonSucceeded = -not $hasPythonError
                        Prompt = $promptMatch.Groups["prompt"].Value
                        Output = $transcript
                        Read = $lastRead
                    }
                }
            }
        }
        catch {}
        Start-Sleep -Milliseconds 100
    } while ([DateTime]::UtcNow -lt $Deadline)

    return [pscustomobject]@{
        TimedOut = $true
        PythonSucceeded = $false
        Prompt = $null
        Output = $null
        Read = $lastRead
    }
}

function Get-MarkerOutput {
    param(
        [Parameter(Mandatory = $true)][string]$TerminalText,
        [Parameter(Mandatory = $true)]$Envelope
    )
    $beginIndex = $TerminalText.LastIndexOf($Envelope.BeginMarker, [StringComparison]::Ordinal)
    if ($beginIndex -lt 0) { return $null }
    $contentStart = $beginIndex + $Envelope.BeginMarker.Length
    $endIndex = $TerminalText.IndexOf($Envelope.EndMarker, $contentStart, [StringComparison]::Ordinal)
    if ($endIndex -lt 0) { return $null }

    $content = $TerminalText.Substring($contentStart, $endIndex - $contentStart).Trim("`r", "`n")
    $pythonSucceeded = $content.Contains($Envelope.SuccessMarker)
    $pythonFailed = $content.Contains($Envelope.ErrorMarker)
    $content = $content.Replace($Envelope.SuccessMarker, "").Replace($Envelope.ErrorMarker, "").Trim("`r", "`n")
    [pscustomobject]@{ PythonSucceeded = $pythonSucceeded -and -not $pythonFailed; Output = $content }
}

function Get-InteractiveOutput {
    param(
        [AllowEmptyString()][string]$BeforeText,
        [Parameter(Mandatory = $true)][string]$AfterText,
        [Parameter(Mandatory = $true)]$Envelope
    )

    $delta = $AfterText
    if ($null -ne $BeforeText -and $AfterText.StartsWith($BeforeText, [StringComparison]::Ordinal)) {
        $delta = $AfterText.Substring($BeforeText.Length)
    }
    if ([string]::IsNullOrWhiteSpace($delta)) { return $null }

    # Do not accept an older prompt: the final visible source line must first
    # have appeared in the newly added terminal transcript.
    if ($null -ne $Envelope.LastVisibleCommand -and
        -not $delta.Contains($Envelope.LastVisibleCommand)) { return $null }

    $trimmed = $delta.TrimEnd()
    if (-not [regex]::IsMatch($trimmed, "(?:^|\r?\n)>>>[ \t]*\z")) { return $null }

    $transcript = [regex]::Replace($trimmed, "(?:\r?\n)?>>>[ \t]*\z", "").Trim("`r", "`n")
    $hasPythonError = [regex]::IsMatch(
        $transcript,
        "(?m)^Traceback \(most recent call last\):|^[A-Za-z_][A-Za-z0-9_.]*(?:Error|Exception):"
    )
    [pscustomobject]@{ PythonSucceeded = -not $hasPythonError; Output = $transcript }
}

function Write-Result {
    param([Parameter(Mandatory = $true)]$Value)
    if ($Json) { $Value | ConvertTo-Json -Depth 6 } else { $Value }
}

if ($Action -eq "Encode") {
    $requestedCode = Get-RequestedCode
    $envelope = New-BridgeEnvelope -PythonCode $requestedCode -Mode $InputMode
    Write-Result ([pscustomobject]@{
        Token = $envelope.Token
        InputMode = $envelope.Mode
        Command = $envelope.Command
        Commands = if ($envelope.Mode -eq "Interactive") { $envelope.Commands } else { $null }
        CommandLength = if ($null -ne $envelope.Command) { $envelope.Command.Length } else { $null }
        CommandCount = $envelope.Commands.Count
    })
    exit 0
}

if ($Action -eq "Discover") {
    $discoveries = New-Object System.Collections.Generic.List[object]
    foreach ($processInfo in @(Get-VirtuosProcesses)) {
        if ($processInfo.VisibleWindows.Count -eq 0) {
            $discoveries.Add([pscustomobject]@{
                ProcessId = $processInfo.Id
                Path = $processInfo.Path
                HasVisibleWindow = $false
                WindowTitle = $null
                WindowClass = $null
                TerminalFound = $false
                Note = "Headless process or GUI window unavailable"
            })
            continue
        }

        foreach ($window in $processInfo.VisibleWindows) {
            $root = [System.Windows.Automation.AutomationElement]::FromHandle($window.Handle)
            $target = [pscustomobject]@{ Process = $processInfo.Process; Window = $window; Root = $root }
            $terminalInfo = $null
            try { $terminalInfo = Find-TerminalElement -Target $target } catch {}
            $best = if ($null -ne $terminalInfo) { $terminalInfo.Best } else { $null }
            $discoveries.Add([pscustomobject]@{
                ProcessId = $processInfo.Id
                Path = $processInfo.Path
                HasVisibleWindow = $true
                WindowTitle = $window.Title
                WindowClass = $window.ClassName
                WindowHandle = $window.Handle.ToInt64()
                TerminalFound = $null -ne $best
                TerminalScore = if ($null -ne $best) { $best.Score } else { $null }
                TerminalName = if ($null -ne $best) { $best.Name } else { $null }
                TerminalClass = if ($null -ne $best) { $best.ClassName } else { $null }
                ReadMethod = if ($null -ne $best) { $best.ReadMethod } else { $null }
                Preview = if ($null -ne $best) { $best.Preview } else { $null }
            })
        }
    }
    Write-Result $discoveries
    exit 0
}

$selectedTarget = Get-VirtuosTarget

if ($Action -eq "Tree") {
    $walker = [System.Windows.Automation.TreeWalker]::RawViewWalker
    $queue = New-Object System.Collections.Queue
    $queue.Enqueue([pscustomobject]@{ Element = $selectedTarget.Root; Depth = 0 })
    $rows = New-Object System.Collections.Generic.List[object]
    while ($queue.Count -gt 0) {
        $item = $queue.Dequeue()
        $description = Get-ElementDescription -Element $item.Element
        if ($null -ne $description) {
            $rows.Add([pscustomobject]@{
                Depth = $item.Depth
                Name = $description.Name
                ClassName = $description.ClassName
                AutomationId = $description.AutomationId
                ControlType = $description.ControlType
                Focusable = $description.IsKeyboardFocusable
                Offscreen = $description.IsOffscreen
                ReadMethod = $description.ReadMethod
                Score = $description.Score
                Preview = $description.Preview
            })
        }
        if ($item.Depth -ge $TreeDepth) { continue }
        try { $child = $walker.GetFirstChild($item.Element) } catch { $child = $null }
        while ($null -ne $child) {
            $queue.Enqueue([pscustomobject]@{ Element = $child; Depth = $item.Depth + 1 })
            try { $child = $walker.GetNextSibling($child) } catch { $child = $null }
        }
    }
    Write-Result $rows
    exit 0
}

$terminalSearch = Find-TerminalElement -Target $selectedTarget
$terminal = $terminalSearch.Best

if ($Action -eq "Read") {
    $readResult = Read-Terminal -Target $selectedTarget -TerminalElement $terminal.Element -AllowClipboardFallback
    if ($null -eq $readResult) { throw "The terminal was found, but its text could not be read." }
    Write-Result ([pscustomobject]@{
        ProcessId = $selectedTarget.Process.Id
        TerminalName = $terminal.Name
        TerminalClass = $terminal.ClassName
        ReadMethod = $readResult.Method
        Text = $readResult.Text
    })
    exit 0
}

if ($Action -eq "Execute") {
    if ($RequireReadyPrompt) {
        if ($terminal.ClassName -notmatch "(?i)PythonShell|ShellWidget" -and $terminal.Name -notmatch "(?i)python|terminal") {
            throw "The selected control is not a Python terminal. Open the Python Terminal tab in Virtuos."
        }
        $ready = Read-Terminal -Target $selectedTarget -TerminalElement $terminal.Element -AllowClipboardFallback
        if ($null -eq $ready -or -not [regex]::IsMatch($ready.Text.TrimEnd(), "(?:^|\r?\n)>>>[ \t]*\z")) {
            throw "The Python terminal must be idle at an empty >>> prompt. Finish or clear the current input first."
        }
    }
    $requestedCode = Get-RequestedCode
    $envelope = New-BridgeEnvelope -PythonCode $requestedCode -Mode $InputMode
    $uiAutomationReadable = $null -ne (Get-ElementTextViaPattern -Element $terminal.Element -MaximumCharacters 100)
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    $beforeText = ""
    $executionResult = $null
    $lastRead = $null
    $completedCommands = New-Object System.Collections.Generic.List[string]
    $failedCommand = $null
    $failedCommandIndex = $null

    if ($envelope.Mode -eq "Interactive") {
        $initialReadError = $null
        try {
            $beforeRead = Read-Terminal -Target $selectedTarget -TerminalElement $terminal.Element -AllowClipboardFallback:(-not $uiAutomationReadable)
            if ($null -ne $beforeRead) {
                $beforeText = $beforeRead.Text
                $lastRead = $beforeRead
            }
        }
        catch { $initialReadError = $_.Exception.Message }

        $terminalReady = $null -ne $lastRead -and [regex]::IsMatch($beforeText.TrimEnd(), "(?:^|\r?\n)>>>(?:[ \t]*)\z")
        if (-not $terminalReady) {
            Write-Result ([pscustomobject]@{
                Success = $false
                TimedOut = $false
                ProcessId = $selectedTarget.Process.Id
                Token = $envelope.Token
                InputMode = $envelope.Mode
                ReadMethod = $null
                Error = "Interactive execution requires a readable terminal at a fresh >>> prompt before sending the first command. $initialReadError"
                CompletedCommands = @()
                FailedCommandIndex = 0
                FailedCommand = [string]$envelope.Commands[0]
            })
            exit 3
        }

        $currentText = $beforeText
        for ($commandIndex = 0; $commandIndex -lt $envelope.Commands.Count; $commandIndex++) {
            $command = [string]$envelope.Commands[$commandIndex]
            Send-TerminalCommand -Target $selectedTarget -TerminalElement $terminal.Element -Command $command
            $commandResult = Wait-InteractivePromptAfterCommand `
                -Target $selectedTarget `
                -TerminalElement $terminal.Element `
                -BeforeText $currentText `
                -ExpectedCommand $command `
                -Deadline $deadline `
                -UiAutomationReadable $uiAutomationReadable

            $lastRead = $commandResult.Read
            if ($commandResult.TimedOut) {
                $failedCommand = $command
                $failedCommandIndex = $commandIndex
                break
            }

            if ($null -ne $lastRead) { $currentText = $lastRead.Text }
            if (-not $commandResult.PythonSucceeded) {
                $failedCommand = $command
                $failedCommandIndex = $commandIndex
                $executionResult = [pscustomobject]@{
                    PythonSucceeded = $false
                    Output = Get-TerminalDelta -BeforeText $beforeText -AfterText $currentText
                }
                break
            }

            $completedCommands.Add($command)
        }

        if ($null -eq $failedCommand -and $null -ne $lastRead) {
            $executionResult = Get-InteractiveOutput -BeforeText $beforeText -AfterText $lastRead.Text -Envelope $envelope
        }
    }
    else {
        Send-TerminalCommand -Target $selectedTarget -TerminalElement $terminal.Element -Command $envelope.Command
        do {
            try {
                $lastRead = Read-Terminal -Target $selectedTarget -TerminalElement $terminal.Element -AllowClipboardFallback:(-not $uiAutomationReadable)
                if ($null -ne $lastRead) {
                    $executionResult = Get-MarkerOutput -TerminalText $lastRead.Text -Envelope $envelope
                }
            }
            catch {}
            if ($null -ne $executionResult) { break }
            Start-Sleep -Milliseconds 250
        } while ([DateTime]::UtcNow -lt $deadline)
    }

    if ($null -eq $executionResult) {
        $tail = $null
        if ($null -ne $lastRead -and $null -ne $lastRead.Text) {
            $tailLength = [Math]::Min(3000, $lastRead.Text.Length)
            $tail = $lastRead.Text.Substring($lastRead.Text.Length - $tailLength)
        }
        Write-Result ([pscustomobject]@{
            Success = $false
            TimedOut = $true
            ProcessId = $selectedTarget.Process.Id
            Token = $envelope.Token
            InputMode = $envelope.Mode
            ReadMethod = if ($null -ne $lastRead) { $lastRead.Method } else { $null }
            Error = if ($envelope.Mode -eq "Interactive") {
                "The Python prompt was not observed after command $($failedCommandIndex + 1) within $TimeoutSeconds seconds."
            } else {
                "The completion marker was not observed within $TimeoutSeconds seconds."
            }
            CompletedCommands = if ($envelope.Mode -eq "Interactive") { @($completedCommands) } else { $null }
            FailedCommandIndex = if ($envelope.Mode -eq "Interactive") { $failedCommandIndex } else { $null }
            FailedCommand = if ($envelope.Mode -eq "Interactive") { $failedCommand } else { $null }
            TerminalTail = $tail
        })
        exit 3
    }

    Write-Result ([pscustomobject]@{
        Success = $executionResult.PythonSucceeded
        TimedOut = $false
        ProcessId = $selectedTarget.Process.Id
        Token = $envelope.Token
        InputMode = $envelope.Mode
        ReadMethod = $lastRead.Method
        Output = $executionResult.Output
        CompletedCommands = if ($envelope.Mode -eq "Interactive") { @($completedCommands) } else { $null }
        FailedCommandIndex = if ($envelope.Mode -eq "Interactive") { $failedCommandIndex } else { $null }
        FailedCommand = if ($envelope.Mode -eq "Interactive") { $failedCommand } else { $null }
    })
    if ($executionResult.PythonSucceeded) { exit 0 } else { exit 4 }
}

throw "Unsupported action: $Action"
