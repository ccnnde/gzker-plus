export const isForumShortcutEvent = (event: KeyboardEvent): boolean => {
  if (
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.isComposing ||
    event.keyCode === 229 ||
    event.repeat
  ) {
    return false;
  }

  return !event.composedPath().some((target) => {
    return (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.matches('input, textarea, select, [role="textbox"], [role="combobox"]'))
    );
  });
};

export const isIgnoredForumShiftKey = (event: KeyboardEvent): boolean => {
  return event.shiftKey && event.key !== '?' && event.key !== 'Escape';
};
