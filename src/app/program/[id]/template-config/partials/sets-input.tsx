import { Input } from '@/components/ui/input';

interface SetsInputProps {
  sets: number;
  onChange: (sets: number) => void;
  disabled?: boolean;
}

export function SetsInput({ sets, onChange, disabled }: SetsInputProps) {
  return (
    <div className="px-4 py-3 border-b border-border bg-muted/40">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">Sets</span>
        <Input
          className="flex-1 h-10 text-xs text-center"
          min="1"
          placeholder="0"
          type="number"
          value={sets}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
