import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CaretDown, Check } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";

export type DropdownSelectOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

type DropdownSelectProps = {
  value: string;
  options: DropdownSelectOption[];
  onValueChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  align?: DropdownMenuPrimitive.DropdownMenuContentProps["align"];
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function DropdownSelect({
  value,
  options,
  onValueChange,
  ariaLabel,
  disabled = false,
  placeholder = "选择",
  className,
  contentClassName,
  align = "start",
}: DropdownSelectProps) {
  const selectedOption = options.find((option) => option.value === value);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    setPortalContainer(document.querySelector<HTMLElement>(".app-shell"));
  }, []);

  return (
    <DropdownMenuPrimitive.Root modal={false}>
      <DropdownMenuPrimitive.Trigger asChild disabled={disabled}>
        <button
          className={cx("dropdown-select-trigger", className)}
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
        >
          <span className="dropdown-select-value">
            {selectedOption?.label ?? placeholder}
          </span>
          <CaretDown className="dropdown-select-icon" size={14} weight="bold" />
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal container={portalContainer ?? undefined}>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={6}
          className={cx("dropdown-menu-content", contentClassName)}
        >
          <DropdownMenuPrimitive.RadioGroup
            value={value}
            onValueChange={onValueChange}
          >
            {options.map((option) => (
              <DropdownMenuPrimitive.RadioItem
                className="dropdown-menu-radio-item"
                disabled={option.disabled}
                key={option.value}
                value={option.value}
              >
                <span className="dropdown-menu-item-indicator">
                  <DropdownMenuPrimitive.ItemIndicator>
                    <Check size={14} weight="bold" />
                  </DropdownMenuPrimitive.ItemIndicator>
                </span>
                <span className="dropdown-menu-item-label">
                  {option.label}
                </span>
              </DropdownMenuPrimitive.RadioItem>
            ))}
          </DropdownMenuPrimitive.RadioGroup>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
