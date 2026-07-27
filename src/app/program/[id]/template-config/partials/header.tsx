interface TemplateConfigHeaderProps {
  exerciseName: string;
  onClose: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function TemplateConfigHeader({
  exerciseName,
  onClose,
  onMouseDown,
}: TemplateConfigHeaderProps) {
  return (
    <div className="flex justify-between items-center px-4 py-3 border-b border-border bg-muted/50 rounded-t-[var(--radius-xl)] cursor-move select-none">
      <span
        onMouseDown={onMouseDown}
        className="text-sm font-medium text-foreground truncate flex-1"
      >
        {exerciseName}
      </span>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground text-lg leading-none ml-2 cursor-pointer"
      >
        ×
      </button>
    </div>
  );
}
