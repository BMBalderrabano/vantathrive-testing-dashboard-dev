'use client';

import * as React from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  onCreateNew?: (value: string) => void;
  allowCreate?: boolean;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No option found.',
  className,
  disabled = false,
  onCreateNew,
  allowCreate = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const handleSelect = (currentValue: string) => {
    if (currentValue.startsWith('__create__')) {
      const newValue = currentValue.replace('__create__', '');
      onCreateNew?.(newValue);
      setOpen(false);
      setSearch('');
    } else {
      const option = options.find((opt) => opt.label === currentValue);
      if (option) {
        const newValue = option.value === value ? undefined : option.value;
        onValueChange(newValue);
        setOpen(false);
        setSearch('');
      }
    }
  };

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const searchLower = search.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchLower),
    );
  }, [options, search]);

  const showCreate =
    allowCreate &&
    onCreateNew &&
    search.trim() &&
    !filteredOptions.some(
      (opt) => opt.label.toLowerCase() === search.toLowerCase(),
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between min-w-0', className)}
        >
          <span className="truncate flex-1 text-left">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {showCreate && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${search}`}
                  onSelect={handleSelect}
                  className="font-medium text-[#2454FF]"
                >
                  Create new: &quot;{search}&quot;
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {filteredOptions.length === 0 && !showCreate && (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              )}
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={handleSelect}
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
