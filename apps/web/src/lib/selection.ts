export function toggleId(ids: number[], id: number) {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

export function selectAllState(shownIds: number[], selectedIds: number[]) {
  const selectedShown = shownIds.filter((id) => selectedIds.includes(id));
  if (selectedShown.length === 0) return false;
  return selectedShown.length === shownIds.length ? true : 'indeterminate';
}

export function toggleAll(shownIds: number[], selectedIds: number[]) {
  return selectAllState(shownIds, selectedIds) === true ? [] : shownIds;
}
