import { Field, FieldProps, Focusable, GamepadButton } from 'decky-frontend-lib';
import { Fragment, JSXElementConstructor, ReactElement, useState } from 'react';

export type ReorderableEntry<T> = {
  label: string;
  data?: T;
  position: number;
};

type ListProps<T> = {
  entries: ReorderableEntry<T>[];
  onSave: (entries: ReorderableEntry<T>[]) => void;
  interactables?: JSXElementConstructor<{ entry: ReorderableEntry<T> }>;
  fieldProps?: FieldProps;
};

/**
 * A component for creating reorderable lists.
 *
 * Implementation example can be found {@link https://github.com/Tormak9970/Component-Testing-Plugin/blob/main/src/testing-window/ReorderableListTest.tsx here}.
 */
export function ReorderableList<T>(props: ListProps<T>) {
  const [entryList, setEntryList] = useState<ReorderableEntry<T>[]>(
    props.entries.sort((a: ReorderableEntry<T>, b: ReorderableEntry<T>) => a.position - b.position),
  );
  const [reorderEnabled, setReorderEnabled] = useState<boolean>(false);

  function toggleReorderEnabled(): void {
    let newReorderValue = !reorderEnabled;
    setReorderEnabled(newReorderValue);

    if (!newReorderValue) {
      props.onSave(entryList);
    }
  }

  return (
    <Fragment>
      <style>{`
        .reorderable-list {
          width: inherit;
          height: inherit;

          flex: 1 1 1px;
          scroll-padding: 48px 0px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-content: stretch;
        }
      `}</style>
      <div className="reorderable-list">
        <Focusable
          onSecondaryButton={toggleReorderEnabled}
          onSecondaryActionDescription={reorderEnabled ? 'Save Order' : 'Reorder'}
          onClick={toggleReorderEnabled}
        >
          {entryList.map((entry: ReorderableEntry<T>) => (
            <ReorderableItem
              listData={entryList}
              entryData={entry}
              reorderEntryFunc={setEntryList}
              reorderEnabled={reorderEnabled}
              fieldProps={props.fieldProps}
            >
              {props.interactables ? <props.interactables entry={entry} /> : null}
            </ReorderableItem>
          ))}
        </Focusable>
      </div>
    </Fragment>
  );
}

type ListEntryProps<T> = {
  fieldProps?: FieldProps;
  listData: ReorderableEntry<T>[];
  entryData: ReorderableEntry<T>;
  reorderEntryFunc: CallableFunction;
  reorderEnabled: boolean;
  children: ReactElement | null;
};

function ReorderableItem<T>(props: ListEntryProps<T>) {
  const listEntries = props.listData;

  function onReorder(e: Event): void {
    if (!props.reorderEnabled) return;

    const event = e as CustomEvent;
    const currentIdx = listEntries.findIndex((entryData: ReorderableEntry<T>) => entryData === props.entryData);
    const currentIdxValue = listEntries[currentIdx];
    if (currentIdx < 0) return;

    let targetPosition: number = -1;
    if (event.detail.button == GamepadButton.DIR_DOWN) {
      targetPosition = currentIdxValue.position + 1;
    } else if (event.detail.button == GamepadButton.DIR_UP) {
      targetPosition = currentIdxValue.position - 1;
    }

    if (targetPosition >= listEntries.length || targetPosition < 0) return;

    let otherToUpdate = listEntries.find((entryData: ReorderableEntry<T>) => entryData.position === targetPosition);
    if (!otherToUpdate) return;

    let currentPosition = currentIdxValue.position;

    currentIdxValue.position = otherToUpdate.position;
    otherToUpdate.position = currentPosition;

    props.reorderEntryFunc(
      [...listEntries].sort((a: ReorderableEntry<T>, b: ReorderableEntry<T>) => a.position - b.position),
    );
  }

  const baseCssProps = {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  };

  return (
    // @ts-ignore
    <Field
      label={props.entryData.label}
      style={props.reorderEnabled ? { ...baseCssProps, background: '#678BA670' } : { ...baseCssProps }}
      {...props.fieldProps}
      focusable={!props.children}
      onButtonDown={onReorder}
    >
      <Focusable style={{ display: 'flex', width: '100%', position: 'relative' }}>{props.children}</Focusable>
    </Field>
  );
}
