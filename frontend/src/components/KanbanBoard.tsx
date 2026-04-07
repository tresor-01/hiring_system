import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Resume, Stage } from '../types';
import ResumeCard from './ResumeCard';
import { applicationsApi } from '../api/applications';
import toast from 'react-hot-toast';

const STAGES: Stage[] = ['NEW', 'SCREENED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED'];

const STAGE_LABELS: Record<Stage, string> = {
  NEW: 'New',
  SCREENED: 'Screened',
  SHORTLISTED: 'Shortlisted',
  INTERVIEWED: 'Interviewed',
  OFFERED: 'Offered',
  HIRED: 'Hired',
  REJECTED: 'Rejected'
};

const STAGE_COLORS: Record<Stage, string> = {
  NEW: 'text-slate-400 border-slate-700',
  SCREENED: 'text-blue-400 border-blue-800',
  SHORTLISTED: 'text-yellow-400 border-yellow-800',
  INTERVIEWED: 'text-purple-400 border-purple-800',
  OFFERED: 'text-green-400 border-green-800',
  HIRED: 'text-emerald-400 border-emerald-800',
  REJECTED: 'text-red-400 border-red-800'
};

interface Props {
  pipeline: Record<Stage, Resume[]>;
  onPipelineChange: (pipeline: Record<Stage, Resume[]>) => void;
}

export default function KanbanBoard({ pipeline, onPipelineChange }: Props) {
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    const sourceStage = source.droppableId as Stage;
    const destStage = destination.droppableId as Stage;

    // Optimistic update
    const newPipeline = { ...pipeline };
    const sourceItems = [...(newPipeline[sourceStage] || [])];
    const destItems = sourceStage === destStage ? sourceItems : [...(newPipeline[destStage] || [])];

    const [moved] = sourceItems.splice(source.index, 1);
    if (moved) {
      moved.stage = destStage;
      destItems.splice(destination.index, 0, moved);

      newPipeline[sourceStage] = sourceItems;
      newPipeline[destStage] = destItems;
      onPipelineChange(newPipeline);

      try {
        await applicationsApi.updateStage(draggableId, destStage);
      } catch (error) {
        toast.error('Failed to update stage');
        onPipelineChange(pipeline); // revert
      }
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
        {STAGES.map(stage => {
          const items = pipeline[stage] || [];
          return (
            <div key={stage} className="flex-shrink-0 w-64">
              <div className={`flex items-center justify-between mb-3 pb-2 border-b ${STAGE_COLORS[stage]}`}>
                <span className={`text-xs font-semibold uppercase tracking-wider ${STAGE_COLORS[stage].split(' ')[0]}`}>
                  {STAGE_LABELS[stage]}
                </span>
                <span className="bg-slate-800 text-slate-400 text-xs px-1.5 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>

              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[200px] rounded-lg p-1 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-indigo-900/20' : ''
                    }`}
                  >
                    {items.map((resume, index) => (
                      <Draggable key={resume.id} draggableId={resume.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <ResumeCard
                              resume={resume}
                              compact={true}
                              dragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <div className="text-xs text-slate-600 text-center py-8">
                        Drop candidates here
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
