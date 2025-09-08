import { useState, useRef, useEffect } from "react";
import { Input } from "~/components/ui/input";

interface QuickInlineEditProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function QuickInlineEdit({
  value,
  onChange,
  placeholder = "Untitled",
  className = "",
}: QuickInlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Update edit value when prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    if (editValue.trim() !== value) {
      onChange(editValue.trim() || placeholder);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  return (
    <div className={className}>
      {isEditing ? (
        <Input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="text-lg font-semibold h-10 px-3"
        />
      ) : (
        <div
          ref={displayRef}
          className="text-lg font-semibold text-zinc-100 truncate cursor-text hover:bg-zinc-800/50 rounded px-3 py-2"
          onClick={handleStartEdit}
        >
          {value || <span className="text-zinc-500">{placeholder}</span>}
        </div>
      )}
    </div>
  );
}