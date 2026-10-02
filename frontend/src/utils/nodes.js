export const NODE_LABELS = {
  N0: 'Emergency Control Center',
  N1: 'Police Station',
  N2: 'Fire Services',
  N3: 'Ambulance Unit',
  N4: 'Field Response Team',
  N5: 'Emergency Shelter',
  N6: 'Backup Control Center',
};

export const getNodeName = (id, nodesList = []) => {
  if (!id) return '';
  const found = nodesList?.find((n) => n.id === id);
  if (found?.label) return found.label;
  if (NODE_LABELS[id]) return NODE_LABELS[id];
  return id;
};

export const formatNode = (id, nodesList = []) => {
  if (!id) return '';
  const name = getNodeName(id, nodesList);
  return name && name !== id ? `${name} (${id})` : id;
};
