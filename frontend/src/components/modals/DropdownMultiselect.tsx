import {
  DialogButton,
  DialogCheckbox,
  DialogCheckboxProps,
  Marquee,
  Menu,
  MenuItem,
  findModuleChild,
  showContextMenu,
} from 'decky-frontend-lib';
import { FC, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa';

const dropDownControlButtonClass = findModuleChild((m) => {
  if (typeof m !== 'object') return undefined;
  for (const prop in m) {
    if (m[prop]?.toString()?.includes('gamepaddropdown_DropDownControlButton')) {
      return m[prop];
    }
  }
});

const DropdownMultiselectItem: FC<
  {
    value: any;
    onSelect: (checked: boolean, value: any) => void;
    checked: boolean;
  } & DialogCheckboxProps
> = ({ value, onSelect, checked: defaultChecked, ...rest }) => {
  const [checked, setChecked] = useState(defaultChecked);

  useEffect(() => {
    onSelect?.(checked, value);
  }, [checked, onSelect, value]);

  return (
    <MenuItem bInteractableItem onClick={() => setChecked((x) => !x)}>
      <DialogCheckbox
        style={{ marginBottom: 0, padding: 0 }}
        className="decky_DropdownMultiselectItem_DialogCheckbox"
        bottomSeparator="none"
        {...rest}
        onClick={() => setChecked((x) => !x)}
        onChange={(checked) => setChecked(checked)}
        controlled
        checked={checked}
      />
    </MenuItem>
  );
};

const DropdownMultiselect: FC<{
  items: {
    label: string;
    value: string;
  }[];
  selected: string[];
  onSelect: (selected: any[]) => void;
  label: string;
}> = ({ label, items, selected, onSelect }) => {
  const [itemsSelected, setItemsSelected] = useState<any>(selected);
  const { t } = useTranslation();

  const handleItemSelect = useCallback((checked, value) => {
    setItemsSelected((x: any) =>
      checked ? [...x.filter((y: any) => y !== value), value] : x.filter((y: any) => y !== value),
    );
  }, []);

  useEffect(() => {
    onSelect(itemsSelected);
  }, [itemsSelected, onSelect]);

  return (
    <DialogButton
      style={{
        display: 'flex',
        alignItems: 'center',
        maxWidth: '100%',
      }}
      className={dropDownControlButtonClass}
      onClick={(evt) => {
        evt.preventDefault();
        showContextMenu(
          <Menu label={label} cancelText={t('DropdownMultiselect.button.back') as string}>
            <style>
              {`
              /* Inherit color from ".basiccontextmenu" */
              .decky_DropdownMultiselectItem_DialogCheckbox > .DialogToggle_Label {
                color: inherit;
              }
              `}
            </style>
            <div style={{ marginTop: '10px' }}>{/*FIXME: Hack for missing padding under label menu*/}</div>
            {items.map((x) => (
              <DropdownMultiselectItem
                key={x.value}
                label={x.label}
                value={x.value}
                checked={itemsSelected.includes(x.value)}
                onSelect={handleItemSelect}
              />
            ))}
          </Menu>,
          evt.currentTarget ?? window,
        );
      }}
    >
      <Marquee>
        {selected.length > 0
          ? selected.map((x: any) => items[items.findIndex((v) => v.value === x)].label).join(', ')
          : '…'}
      </Marquee>
      <div style={{ flexGrow: 1, minWidth: '1ch' }} />
      <FaChevronDown style={{ height: '1em', flex: '0 0 1em' }} />
    </DialogButton>
  );
};

export default DropdownMultiselect;
