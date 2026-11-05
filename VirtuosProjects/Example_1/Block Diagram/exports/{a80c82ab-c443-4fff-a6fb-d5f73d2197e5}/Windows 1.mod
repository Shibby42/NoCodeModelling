/***********************************************************/
// Windows 1.mod
// Erstellt am 05.11.2026 , 13:32
// von Virtuos v3.8.19
/***********************************************************/
/* simulation settings: */

ModelUuid = {f8246cc2-6f84-48d9-a6ff-22aed54cba9a};
SolverUuid = {e786a562-ba6d-42bd-98e8-0a402ecf0ff9};
SolverIndex = 0;
SolverName = Windows 1;
/***********************************************************/
/* collision pairs: */

CP.count = 1;
CP(1,1) = 0;
CP(1,2) = 0;
/***********************************************************/
Rtsim.SETTINGS_COUNT = 1 ; 
/***********************************************************/
Rtsim.SETTINGS_ID = 0 ; 
Rtsim.H_SIM = 0.01 ; 
Rtsim.H_AUTOCYCLE = 0.01 ; 
Rtsim.H_SIM_END_TIME = 0 ; 
Rtsim.SIM_AS_FAST_AS_POSSIBLE = 0 ; 
Rtsim.IS_MASTER_SOLVER = 1 ; 
Rtsim.INTER_SOLVER_SYNCHRONIZATION_TIMEOUT = 20 ; 
Rtsim.EnableIOVariableClamping = 1 ; 
Rtsim.saveAndRestoreSimulationStates = 0 ;
Rtsim.simulationStatesExportPath = G:/07_Laufende_Projekte/NoCodeModelling/NoCodeModelling/VirtuosProjects\Example_1\Block Diagram\exports\{a80c82ab-c443-4fff-a6fb-d5f73d2197e5}\Windows 1.ssv ;
Rtsim.simulationStatesRestorePath = G:/07_Laufende_Projekte/NoCodeModelling/NoCodeModelling/VirtuosProjects\Example_1\simulation states\Windows 1.ssv ;
Rtsim.simulationStatesFifoSizeBytes = 104857600 ;
Rtsim.EQUILCONTROL = 0 ; 
Rtsim.KSTEPMETHOD(1) = ODE2 (Standard) ; 
Rtsim.KSTEPMETHOD(2) = none ; 
Rtsim.PSIboundaries = 0.0001 0.001 ;
Rtsim.NRIntegratorMaxIterations = 1 ;
Rtsim.NRIntegratorEpsilonBound = 0 ;
Rtsim.NREquationMaxIterations = 1 ;
Rtsim.NREquationEpsilonBound = 0 ;
Rtsim.localSimStepODEFactor = 0 ;
Rtsim.localSimStepSlowerFactor = 1 ;
Rtsim.GRAVITATIONAL_DIRECTION = -Z ;
Rtsim.OPTIMIZED_COLLISION_NORMAL = 0 ; 
Rtsim.PENETRATION_DEPTH_TOLERANCE = 0.0001 ; 
Rtsim.OPTIMIZED_STACKING = 1 ; 
Rtsim.MAX_ITERATION_MF_PHYS = 3 ;
Rtsim.ALARM_SENSORS_REPORTING_DELAY = 0.5 ; 
Rtsim.NOF_MODCOM = 15 ; 
/***********************************************************/
Rtsim.GENERAL_MODEL_FLAGS_1 = 65279 ; 
Rtsim.GENERAL_MODEL_FLAGS_2 = 2039 ; 
Rtsim.GENERAL_MODEL_FLAGS_3 = 16382 ; 
Rtsim.GENERAL_MODEL_FLAGS_4 = 0 ; 
/***********************************************************/
Rtsim.GUI_VERSION = 3.8.19.9802.41817 ; 
/* model components: */

Exec(1) = LOGICAL_PERIPHERAL_INPUTS ; 

LOGICAL_PERIPHERAL_INPUTS.LoopID = 0 ; 
LOGICAL_PERIPHERAL_INPUTS.SettingsID = 0 ; 
LOGICAL_PERIPHERAL_INPUTS.HasMemoryBehaviour = 0 ; 
LOGICAL_PERIPHERAL_INPUTS.Type = IOPort ;
LOGICAL_PERIPHERAL_INPUTS.HierarchicalName = LOGICAL_PERIPHERAL_INPUTS ; 
LOGICAL_PERIPHERAL_INPUTS.Version = 1 ; 
LOGICAL_PERIPHERAL_INPUTS.Param = none ; 

LOGICAL_PERIPHERAL_INPUTS.InpNo = 1 ;
LOGICAL_PERIPHERAL_INPUTS.OutNo = 1 ;
LOGICAL_PERIPHERAL_INPUTS.Input(1).ConnectionName = {4bf174bb-acec-4bfe-9840-e0131ebf7c6e} ;
LOGICAL_PERIPHERAL_INPUTS.Input(1).Name = {4bf174bb-acec-4bfe-9840-e0131ebf7c6e} ;
LOGICAL_PERIPHERAL_INPUTS.Input(1).DataType = VReal64 ;
LOGICAL_PERIPHERAL_INPUTS.Input(1).DataSize = 8 ;
LOGICAL_PERIPHERAL_INPUTS.Input(1).DataFlag = 0 ;
LOGICAL_PERIPHERAL_INPUTS.Output(1).Name = {ONC}_{4bf174bb-acec-4bfe-9840-e0131ebf7c6e} ;
LOGICAL_PERIPHERAL_INPUTS.Output(1).DataType = VReal64 ;
LOGICAL_PERIPHERAL_INPUTS.Output(1).DataSize = 8 ;
LOGICAL_PERIPHERAL_INPUTS.Output(1).DataFlag = 0 ;
/***********************************************************/

Exec(2) = CONTINUOUS_PERIPHERAL_INPUTS ; 

CONTINUOUS_PERIPHERAL_INPUTS.LoopID = 0 ; 
CONTINUOUS_PERIPHERAL_INPUTS.SettingsID = 0 ; 
CONTINUOUS_PERIPHERAL_INPUTS.HasMemoryBehaviour = 0 ; 
CONTINUOUS_PERIPHERAL_INPUTS.Type = FineInterpolation ;
CONTINUOUS_PERIPHERAL_INPUTS.HierarchicalName = CONTINUOUS_PERIPHERAL_INPUTS ; 
CONTINUOUS_PERIPHERAL_INPUTS.Version = 1 ; 
CONTINUOUS_PERIPHERAL_INPUTS.Param = none ; 

CONTINUOUS_PERIPHERAL_INPUTS.InpNo = 0 ;
CONTINUOUS_PERIPHERAL_INPUTS.OutNo = 0 ;
/***********************************************************/

Exec(3) = LOGICAL_PERIPHERAL_INPUTS_SHM ; 

LOGICAL_PERIPHERAL_INPUTS_SHM.LoopID = 0 ; 
LOGICAL_PERIPHERAL_INPUTS_SHM.SettingsID = 0 ; 
LOGICAL_PERIPHERAL_INPUTS_SHM.HasMemoryBehaviour = 0 ; 
LOGICAL_PERIPHERAL_INPUTS_SHM.Type = SharedMemoryInput ;
LOGICAL_PERIPHERAL_INPUTS_SHM.HierarchicalName = LOGICAL_PERIPHERAL_INPUTS_SHM ; 
LOGICAL_PERIPHERAL_INPUTS_SHM.Version = 1 ; 
LOGICAL_PERIPHERAL_INPUTS_SHM.Param = LOGICAL_PERIPHERAL_INPUTS_SHM.par ; 

LOGICAL_PERIPHERAL_INPUTS_SHM.InpNo = 0 ;
LOGICAL_PERIPHERAL_INPUTS_SHM.OutNo = 0 ;
/***********************************************************/

Exec(4) = CONTINUOUS_PERIPHERAL_INPUTS_SHM ; 

CONTINUOUS_PERIPHERAL_INPUTS_SHM.LoopID = 0 ; 
CONTINUOUS_PERIPHERAL_INPUTS_SHM.SettingsID = 0 ; 
CONTINUOUS_PERIPHERAL_INPUTS_SHM.HasMemoryBehaviour = 0 ; 
CONTINUOUS_PERIPHERAL_INPUTS_SHM.Type = SharedMemoryInput ;
CONTINUOUS_PERIPHERAL_INPUTS_SHM.HierarchicalName = CONTINUOUS_PERIPHERAL_INPUTS_SHM ; 
CONTINUOUS_PERIPHERAL_INPUTS_SHM.Version = 1 ; 
CONTINUOUS_PERIPHERAL_INPUTS_SHM.Param = CONTINUOUS_PERIPHERAL_INPUTS_SHM.par ; 

CONTINUOUS_PERIPHERAL_INPUTS_SHM.InpNo = 0 ;
CONTINUOUS_PERIPHERAL_INPUTS_SHM.OutNo = 0 ;
/***********************************************************/

Exec(5) = CONTINUOUS_PERIPHERAL_INPUTS_SHM_FI ; 

CONTINUOUS_PERIPHERAL_INPUTS_SHM_FI.LoopID = 0 ; 
CONTINUOUS_PERIPHERAL_INPUTS_SHM_FI.SettingsID = 0 ; 
CONTINUOUS_PERIPHERAL_INPUTS_SHM_FI.HasMemoryBehaviour = 0 ; 
CONTINUOUS_PERIPHERAL_INPUTS_SHM_FI.Type = FineInterpolation ;
CONTINUOUS_PERIPHERAL_INPUTS_SHM_FI.HierarchicalName = CONTINUOUS_PERIPHERAL_INPUTS_SHM_FI ; 
CONTINUOUS_PERIPHERAL_INPUTS_SHM_FI.Version = 1 ; 
CONTINUOUS_PERIPHERAL_INPUTS_SHM_FI.Param = none ; 

CONTINUOUS_PERIPHERAL_INPUTS_SHM_FI.InpNo = 0 ;
CONTINUOUS_PERIPHERAL_INPUTS_SHM_FI.OutNo = 0 ;
/***********************************************************/

Exec(6) = {ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63} ; 

{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.LoopID = 0 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.SettingsID = 0 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.HasMemoryBehaviour = 201216 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Type = Material pool ; //[Block Diagram].[Materials].[Material1]
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.HierarchicalName = [Block Diagram].[Materials].[Material1] ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Param = {ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.par ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Version = 1 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.InpNo = 3 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.OutNo = 2 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(1).ConnectionName = {58c50360-ce94-4c88-93f7-21057150082b} ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(1).Name = {58c50360-ce94-4c88-93f7-21057150082b} ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(1).DataType = VReal64 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(1).DataSize = 8 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(1).DataFlag = 0 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(2).ConnectionName = {85e992a3-2d0e-41d5-bcde-7892773f39da} ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(2).Name = {85e992a3-2d0e-41d5-bcde-7892773f39da} ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(2).DataType = VReal64 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(2).DataSize = 8 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(2).DataFlag = 0 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(3).ConnectionName = {78b7b5b5-1ee6-4c54-9ab5-cd03eb743b71} ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(3).Name = {78b7b5b5-1ee6-4c54-9ab5-cd03eb743b71} ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(3).DataType = VReal64 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(3).DataSize = 8 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Input(3).DataFlag = 0 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Output(1).Name = {cc26ae20-9a44-4e7e-b89c-d67d030f7ce5} ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Output(1).DataType = VReal64 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Output(1).DataSize = 8 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Output(1).DataFlag = 0 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Output(2).Name = {89ea08d9-7d29-4255-bf31-ad26c31eaf5d} ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Output(2).DataType = VUuid ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Output(2).DataSize = 16 ; 
{ad9aaf7a-2154-4935-81d9-c9a2e5b5bf63}.Output(2).DataFlag = 0 ; 
/***********************************************************/

Exec(7) = {c3436843-b149-43f2-a0ef-a41f6d234a5f} ; 

{c3436843-b149-43f2-a0ef-a41f6d234a5f}.LoopID = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.SettingsID = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.HasMemoryBehaviour = 201216 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Type = Linear conveyor ; //[Block Diagram].[Linear conveyor]
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.HierarchicalName = [Block Diagram].[Linear conveyor] ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Param = {c3436843-b149-43f2-a0ef-a41f6d234a5f}.par ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Version = 1 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.InpNo = 16 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.OutNo = 5 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(1).ConnectionName = {78def156-af74-46c8-84fa-ec7006a87744} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(1).Name = {78def156-af74-46c8-84fa-ec7006a87744} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(1).DataType = VBiDirectionalFieldContainer ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(1).DataSize = 16 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(1).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(2).ConnectionName = {1cc74c16-102e-4479-a203-46103bded9ae} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(2).Name = {1cc74c16-102e-4479-a203-46103bded9ae} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(2).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(2).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(2).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(3).ConnectionName = {853be689-7a2f-4c7e-80e6-c74978d28715} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(3).Name = {853be689-7a2f-4c7e-80e6-c74978d28715} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(3).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(3).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(3).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(4).ConnectionName = {7c6db255-67db-4663-8afa-a4ba069aff36} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(4).Name = {7c6db255-67db-4663-8afa-a4ba069aff36} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(4).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(4).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(4).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(5).ConnectionName = {e101fde8-7f36-4fdf-86d5-ccbca95d0a8b} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(5).Name = {e101fde8-7f36-4fdf-86d5-ccbca95d0a8b} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(5).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(5).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(5).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(6).ConnectionName = {3bebab7b-85c5-4cb0-bde7-72fe9fb74d93} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(6).Name = {3bebab7b-85c5-4cb0-bde7-72fe9fb74d93} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(6).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(6).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(6).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(7).ConnectionName = {3f2decbf-e423-474a-ba25-d31d7c2cf7bd} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(7).Name = {3f2decbf-e423-474a-ba25-d31d7c2cf7bd} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(7).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(7).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(7).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(8).ConnectionName = {a4021cac-616a-4cb0-bfb3-6945a41b2917} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(8).Name = {a4021cac-616a-4cb0-bfb3-6945a41b2917} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(8).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(8).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(8).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(9).ConnectionName = {a068da3e-bc0e-4941-93b4-c2848671dfb6} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(9).Name = {a068da3e-bc0e-4941-93b4-c2848671dfb6} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(9).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(9).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(9).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(10).ConnectionName = {948257cd-43d8-4147-82e0-8a8730153313} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(10).Name = {948257cd-43d8-4147-82e0-8a8730153313} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(10).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(10).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(10).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(11).ConnectionName = {5bba66ec-92b5-48a6-a198-fbd635a57ce2} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(11).Name = {5bba66ec-92b5-48a6-a198-fbd635a57ce2} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(11).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(11).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(11).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(12).ConnectionName = {0574236d-36d9-4b28-9ac8-c12569b43400} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(12).Name = {0574236d-36d9-4b28-9ac8-c12569b43400} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(12).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(12).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(12).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(13).ConnectionName = {16b85a67-66a0-4022-a7b4-b64d5b5e9cad} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(13).Name = {16b85a67-66a0-4022-a7b4-b64d5b5e9cad} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(13).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(13).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(13).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(14).ConnectionName = {9fb2d1bd-3037-4f1a-ab47-617455e4d9a0} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(14).Name = {9fb2d1bd-3037-4f1a-ab47-617455e4d9a0} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(14).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(14).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(14).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(15).ConnectionName = {3d754bdd-fd55-4269-9df7-913723622ddd} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(15).Name = {3d754bdd-fd55-4269-9df7-913723622ddd} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(15).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(15).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(15).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(16).ConnectionName = {cc89384b-995c-467d-8a83-ed753ecc3ecd} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(16).Name = {cc89384b-995c-467d-8a83-ed753ecc3ecd} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(16).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(16).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Input(16).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(1).Name = {d40336b3-d0ff-4e1c-a6b2-8d5b07be385c} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(1).DataType = VBiDirectionalFieldContainer ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(1).DataSize = 16 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(1).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(2).Name = {bbe7387f-5b48-47fb-a81f-bab658536b94} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(2).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(2).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(2).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(3).Name = {42439095-7eeb-495a-957a-6e66d9692efb} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(3).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(3).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(3).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(4).Name = {ad2be5d2-a52b-40c4-b8f3-0b8146c1ebf9} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(4).DataType = VReal64 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(4).DataSize = 8 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(4).DataFlag = 0 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(5).Name = {5f294519-746b-4885-8de0-6f7a21a9ad55} ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(5).DataType = VUuid ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(5).DataSize = 16 ; 
{c3436843-b149-43f2-a0ef-a41f6d234a5f}.Output(5).DataFlag = 0 ; 
/***********************************************************/

Exec(8) = {21defccb-84d0-4627-881d-dfb65d473b9d} ; 

{21defccb-84d0-4627-881d-dfb65d473b9d}.LoopID = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.SettingsID = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.HasMemoryBehaviour = 201216 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Type = Material source ; //[Block Diagram].[Material source]
{21defccb-84d0-4627-881d-dfb65d473b9d}.HierarchicalName = [Block Diagram].[Material source] ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Param = {21defccb-84d0-4627-881d-dfb65d473b9d}.par ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Version = 1 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.InpNo = 13 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.OutNo = 6 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(1).ConnectionName = {554a46a0-2f89-4609-bc11-5b281656f715} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(1).Name = {554a46a0-2f89-4609-bc11-5b281656f715} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(1).DataType = VBiDirectionalFieldContainer ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(1).DataSize = 16 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(1).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(2).ConnectionName = {a4be9f4f-e04b-4374-b694-77132c89d79b} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(2).Name = {a4be9f4f-e04b-4374-b694-77132c89d79b} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(2).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(2).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(2).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(3).ConnectionName = {83c77b2d-7372-47f4-9221-cc509847935c} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(3).Name = {83c77b2d-7372-47f4-9221-cc509847935c} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(3).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(3).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(3).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(4).ConnectionName = {4d455931-1bda-43f8-8a1b-fe19e61bc60a} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(4).Name = {4d455931-1bda-43f8-8a1b-fe19e61bc60a} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(4).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(4).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(4).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(5).ConnectionName = {d53916fd-a1ec-4631-aa97-6cdc616c1ba1} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(5).Name = {d53916fd-a1ec-4631-aa97-6cdc616c1ba1} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(5).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(5).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(5).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(6).ConnectionName = {62378cbe-39c0-4b29-949d-36aef9eed766} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(6).Name = {62378cbe-39c0-4b29-949d-36aef9eed766} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(6).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(6).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(6).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(7).ConnectionName = {f85fa94e-b8a2-46aa-96a6-97834c7b3d04} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(7).Name = {f85fa94e-b8a2-46aa-96a6-97834c7b3d04} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(7).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(7).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(7).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(8).ConnectionName = {cbab6aa8-60ad-44d8-afc3-b99105270e3d} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(8).Name = {cbab6aa8-60ad-44d8-afc3-b99105270e3d} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(8).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(8).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(8).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(9).ConnectionName = {bfc91af0-502b-4557-b64c-ee8d3b663a35} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(9).Name = {bfc91af0-502b-4557-b64c-ee8d3b663a35} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(9).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(9).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(9).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(10).ConnectionName = {632f55ed-fe4e-456b-8eff-dc0d0d1012f9} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(10).Name = {632f55ed-fe4e-456b-8eff-dc0d0d1012f9} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(10).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(10).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(10).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(11).ConnectionName = {6fe1b11d-822f-4198-817b-f5cc5b7236b8} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(11).Name = {6fe1b11d-822f-4198-817b-f5cc5b7236b8} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(11).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(11).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(11).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(12).ConnectionName = {5f7d3c56-e788-485e-ad9f-7386e00bc393} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(12).Name = {5f7d3c56-e788-485e-ad9f-7386e00bc393} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(12).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(12).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(12).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(13).ConnectionName = {3abbb5fb-401c-4f9c-b3cd-82a3127b41ac} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(13).Name = {3abbb5fb-401c-4f9c-b3cd-82a3127b41ac} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(13).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(13).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Input(13).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(1).Name = {a806e7f9-a7a0-4d62-a661-233374ccd517} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(1).DataType = VBiDirectionalFieldContainer ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(1).DataSize = 16 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(1).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(2).Name = {9dc526ea-482e-4c7d-8cde-b6f66f40e860} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(2).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(2).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(2).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(3).Name = {15bdddd1-e308-4f4d-bc5b-4a8fc5f2715a} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(3).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(3).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(3).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(4).Name = {bada6829-f6a2-4747-8ae0-4145ee5a70ee} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(4).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(4).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(4).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(5).Name = {0eb5e0ce-d25e-4606-91af-8fc2616874b1} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(5).DataType = VReal64 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(5).DataSize = 8 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(5).DataFlag = 0 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(6).Name = {7852a9e6-7318-4435-ac90-1fa9d4711374} ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(6).DataType = VUuid ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(6).DataSize = 16 ; 
{21defccb-84d0-4627-881d-dfb65d473b9d}.Output(6).DataFlag = 0 ; 
/***********************************************************/

Exec(9) = {edf58935-455a-4116-9647-e66021bba3a9} ; 

{edf58935-455a-4116-9647-e66021bba3a9}.LoopID = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.SettingsID = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.HasMemoryBehaviour = 201216 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Type = Line sensor (straight) ; //[Block Diagram].[Line sensor (straight)]
{edf58935-455a-4116-9647-e66021bba3a9}.HierarchicalName = [Block Diagram].[Line sensor (straight)] ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Param = {edf58935-455a-4116-9647-e66021bba3a9}.par ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Version = 1 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.InpNo = 3 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.OutNo = 11 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(1).ConnectionName = {89a6d849-82cd-4135-ba93-cebddd932861} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(1).Name = {89a6d849-82cd-4135-ba93-cebddd932861} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(1).DataType = VBiDirectionalFieldContainer ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(1).DataSize = 16 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(1).DataFlag = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(2).ConnectionName = {65ee7a16-2f94-4690-bf7c-048a31ea70b0} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(2).Name = {65ee7a16-2f94-4690-bf7c-048a31ea70b0} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(2).DataType = VReal64 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(2).DataSize = 8 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(2).DataFlag = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(3).ConnectionName = {61050124-337d-4d0b-b900-631307f287ed} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(3).Name = {61050124-337d-4d0b-b900-631307f287ed} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(3).DataType = VReal64 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(3).DataSize = 8 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Input(3).DataFlag = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(1).Name = {e01501df-ca6b-4ef2-8ff3-614ee5cb1caa} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(1).DataType = VBiDirectionalFieldContainer ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(1).DataSize = 16 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(1).DataFlag = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(2).Name = {e99be1d3-eb12-43bd-8d18-3928909e37dd} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(2).DataType = VReal64 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(2).DataSize = 8 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(2).DataFlag = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(3).Name = {9ad745a1-39c4-4496-9e62-17aa88100eb0} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(3).DataType = VReal64 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(3).DataSize = 8 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(3).DataFlag = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(4).Name = {d2b76074-9d07-41d9-bf95-1570f2773f0f} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(4).DataType = VReal64 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(4).DataSize = 8 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(4).DataFlag = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(5).Name = {55390d9d-5bf9-4a25-926c-2661b7ac6b32} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(5).DataType = VUuid ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(5).DataSize = 16 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(5).DataFlag = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(6).Name = {28a756ae-1713-41c1-97b5-531055ccdeb3} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(6).DataType = VReal64 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(6).DataSize = 8 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(6).DataFlag = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(7).Name = {1916f93b-0a76-45bb-82f4-b51f86840cbe} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(7).DataType = VReal64 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(7).DataSize = 8 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(7).DataFlag = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(8).Name = {778e37f1-19b4-4a0a-b42a-f2ba5b10e45d} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(8).DataType = VReal64 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(8).DataSize = 8 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(8).DataFlag = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(9).Name = {dd961f8a-869a-4f89-af7a-59a9829acf5f} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(9).DataType = VReal64 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(9).DataSize = 8 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(9).DataFlag = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(10).Name = {30cb6413-7196-4fd7-bf5e-bf9924bb1820} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(10).DataType = VReal64 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(10).DataSize = 8 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(10).DataFlag = 0 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(11).Name = {06d5cd5c-193b-4846-8593-6723d4c6283c} ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(11).DataType = VReal64 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(11).DataSize = 8 ; 
{edf58935-455a-4116-9647-e66021bba3a9}.Output(11).DataFlag = 0 ; 
/***********************************************************/

Exec(10) = {93543dc8-0dc0-4220-804a-82ec50306ef4} ; 

{93543dc8-0dc0-4220-804a-82ec50306ef4}.LoopID = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.SettingsID = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.HasMemoryBehaviour = 201216 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Type = KinAxisV2 ; //[Block Diagram].[Axis]
{93543dc8-0dc0-4220-804a-82ec50306ef4}.HierarchicalName = [Block Diagram].[Axis] ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Param = {93543dc8-0dc0-4220-804a-82ec50306ef4}.par ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Version = 1 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.InpNo = 8 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.OutNo = 6 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(1).ConnectionName = {710b6c2c-e789-4127-b160-97457f2f9043} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(1).Name = {710b6c2c-e789-4127-b160-97457f2f9043} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(1).DataType = VBiDirectionalFieldContainer ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(1).DataSize = 16 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(1).DataFlag = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(2).ConnectionName = {e6ad1dd7-0f24-49e4-a6c2-c924ac1256b5} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(2).Name = {e6ad1dd7-0f24-49e4-a6c2-c924ac1256b5} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(2).DataType = VReal64 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(2).DataSize = 8 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(2).DataFlag = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(3).ConnectionName = {df180340-ceb7-432a-b78e-17bba458ce6d} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(3).Name = {df180340-ceb7-432a-b78e-17bba458ce6d} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(3).DataType = VReal64 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(3).DataSize = 8 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(3).DataFlag = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(4).ConnectionName = {0af9e5df-c49b-4404-9839-d2ae18f5f465} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(4).Name = {0af9e5df-c49b-4404-9839-d2ae18f5f465} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(4).DataType = VReal64 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(4).DataSize = 8 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(4).DataFlag = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(5).ConnectionName = {be004a2b-f039-4050-abbb-e3d60e09776d} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(5).Name = {be004a2b-f039-4050-abbb-e3d60e09776d} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(5).DataType = VReal64 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(5).DataSize = 8 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(5).DataFlag = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(6).ConnectionName = {89b2dc84-ba56-4614-b0c8-3d76d5f1665e} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(6).Name = {89b2dc84-ba56-4614-b0c8-3d76d5f1665e} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(6).DataType = VReal64 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(6).DataSize = 8 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(6).DataFlag = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(7).ConnectionName = {4457245f-08aa-411a-96ec-974b94331fff} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(7).Name = {4457245f-08aa-411a-96ec-974b94331fff} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(7).DataType = VReal64 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(7).DataSize = 8 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(7).DataFlag = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(8).ConnectionName = {585ae82c-afe6-4a84-996c-f1339a1b1a6f} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(8).Name = {585ae82c-afe6-4a84-996c-f1339a1b1a6f} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(8).DataType = VReal64 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(8).DataSize = 8 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Input(8).DataFlag = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(1).Name = {9d31f87e-79bc-46b5-93b1-56041fcf5478} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(1).DataType = VBiDirectionalFieldContainer ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(1).DataSize = 16 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(1).DataFlag = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(2).Name = {53b0f112-6398-4101-b27b-b90a64582c35} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(2).DataType = VReal64 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(2).DataSize = 8 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(2).DataFlag = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(3).Name = {0c187a6a-c204-46c8-9bec-769e18135b2e} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(3).DataType = VReal64 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(3).DataSize = 8 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(3).DataFlag = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(4).Name = {b4a51940-957f-41d5-8bdb-82110a528018} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(4).DataType = VReal64 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(4).DataSize = 8 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(4).DataFlag = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(5).Name = {36b75645-53a7-487f-a6c8-801fce4ff8c7} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(5).DataType = VUuid ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(5).DataSize = 16 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(5).DataFlag = 0 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(6).Name = {4dea4487-5f49-425b-82fa-b692cadfde72} ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(6).DataType = VReal64 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(6).DataSize = 8 ; 
{93543dc8-0dc0-4220-804a-82ec50306ef4}.Output(6).DataFlag = 0 ; 
/***********************************************************/

Exec(11) = {3127245c-9d41-41de-98f2-098e7f874cc6} ; 

{3127245c-9d41-41de-98f2-098e7f874cc6}.LoopID = 0 ; 
{3127245c-9d41-41de-98f2-098e7f874cc6}.SettingsID = 0 ; 
{3127245c-9d41-41de-98f2-098e7f874cc6}.HasMemoryBehaviour = 168704 ; 
{3127245c-9d41-41de-98f2-098e7f874cc6}.Type = Temporary material pool ; //[Block Diagram].[MPool-Temp]
{3127245c-9d41-41de-98f2-098e7f874cc6}.HierarchicalName = [Block Diagram].[MPool-Temp] ; 
{3127245c-9d41-41de-98f2-098e7f874cc6}.Param = none ; 
{3127245c-9d41-41de-98f2-098e7f874cc6}.Version = 1 ; 
{3127245c-9d41-41de-98f2-098e7f874cc6}.InpNo = 0 ; 
{3127245c-9d41-41de-98f2-098e7f874cc6}.OutNo = 1 ; 
{3127245c-9d41-41de-98f2-098e7f874cc6}.Output(1).Name = {39ab6929-0368-4840-8791-153909178f84} ; 
{3127245c-9d41-41de-98f2-098e7f874cc6}.Output(1).DataType = VUuid ; 
{3127245c-9d41-41de-98f2-098e7f874cc6}.Output(1).DataSize = 16 ; 
{3127245c-9d41-41de-98f2-098e7f874cc6}.Output(1).DataFlag = 0 ; 
/***********************************************************/

Exec(12) = {c808176c-1fbc-46c2-8824-97cd6feb99f7} ; 

{c808176c-1fbc-46c2-8824-97cd6feb99f7}.LoopID = 0 ; 
{c808176c-1fbc-46c2-8824-97cd6feb99f7}.SettingsID = 0 ; 
{c808176c-1fbc-46c2-8824-97cd6feb99f7}.HasMemoryBehaviour = 164096 ; 
{c808176c-1fbc-46c2-8824-97cd6feb99f7}.Type = MfCommandInterface ; //[Block Diagram].[MfCommandInterface]
{c808176c-1fbc-46c2-8824-97cd6feb99f7}.HierarchicalName = [Block Diagram].[MfCommandInterface] ; 
{c808176c-1fbc-46c2-8824-97cd6feb99f7}.Param = none ; 
{c808176c-1fbc-46c2-8824-97cd6feb99f7}.Version = 1 ; 
{c808176c-1fbc-46c2-8824-97cd6feb99f7}.InpNo = 1 ; 
{c808176c-1fbc-46c2-8824-97cd6feb99f7}.OutNo = 0 ; 
{c808176c-1fbc-46c2-8824-97cd6feb99f7}.Input(1).ConnectionName = {7b1f4159-c971-441f-a3d3-16b4e648a518} ; 
{c808176c-1fbc-46c2-8824-97cd6feb99f7}.Input(1).Name = {7b1f4159-c971-441f-a3d3-16b4e648a518} ; 
{c808176c-1fbc-46c2-8824-97cd6feb99f7}.Input(1).DataType = VEventCommunicationChannel ; 
{c808176c-1fbc-46c2-8824-97cd6feb99f7}.Input(1).DataSize = 20000000 ; 
{c808176c-1fbc-46c2-8824-97cd6feb99f7}.Input(1).DataFlag = 0 ; 
/***********************************************************/

Exec(13) = {dd58a7d1-910b-4aed-9e57-4bb3412a7fab} ; 

{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.LoopID = 0 ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.SettingsID = 0 ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.HasMemoryBehaviour = 164096 ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.Type = GlobalEventInterfaceDispatcher ; //[Block Diagram].[GlobalEventInterfaceDispatcher]
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.HierarchicalName = [Block Diagram].[GlobalEventInterfaceDispatcher] ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.Param = none ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.Version = 1 ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.InpNo = 1 ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.OutNo = 1 ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.Input(1).ConnectionName = {d2d82c14-9978-4493-9734-ba2dbe10ad00} ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.Input(1).Name = {d2d82c14-9978-4493-9734-ba2dbe10ad00} ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.Input(1).DataType = VEventCommunicationChannel ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.Input(1).DataSize = 20000000 ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.Input(1).DataFlag = 0 ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.Output(1).ConnectionName = {282ba3f6-627c-41de-9be1-3f9484de73e7} ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.Output(1).Name = {282ba3f6-627c-41de-9be1-3f9484de73e7} ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.Output(1).DataType = VEventCommunicationChannel ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.Output(1).DataSize = 20000000 ; 
{dd58a7d1-910b-4aed-9e57-4bb3412a7fab}.Output(1).DataFlag = 0 ; 
/***********************************************************/

Exec(14) = PERIPHERAL_OUTPUTS ; 

PERIPHERAL_OUTPUTS.LoopID = 0 ; 
PERIPHERAL_OUTPUTS.SettingsID = 0 ; 
PERIPHERAL_OUTPUTS.HasMemoryBehaviour = 0 ; 
PERIPHERAL_OUTPUTS.Type = IOPort ; 
PERIPHERAL_OUTPUTS.HierarchicalName = PERIPHERAL_OUTPUTS ; 
PERIPHERAL_OUTPUTS.Version = 1 ; 
PERIPHERAL_OUTPUTS.Param = none ; 

PERIPHERAL_OUTPUTS.InpNo = 0 ;
PERIPHERAL_OUTPUTS.OutNo = 0 ;
/***********************************************************/

Exec(15) = PERIPHERAL_OUTPUTS_SHM ; 

PERIPHERAL_OUTPUTS_SHM.LoopID = 0 ; 
PERIPHERAL_OUTPUTS_SHM.SettingsID = 0 ; 
PERIPHERAL_OUTPUTS_SHM.HasMemoryBehaviour = 0 ; 
PERIPHERAL_OUTPUTS_SHM.Type = SharedMemoryOutput ; 
PERIPHERAL_OUTPUTS_SHM.HierarchicalName = PERIPHERAL_OUTPUTS_SHM ; 
PERIPHERAL_OUTPUTS_SHM.Version = 1 ; 
PERIPHERAL_OUTPUTS_SHM.Param = PERIPHERAL_OUTPUTS_SHM.par ; 

PERIPHERAL_OUTPUTS_SHM.InpNo = 0 ;
PERIPHERAL_OUTPUTS_SHM.OutNo = 0 ;
/***********************************************************/

