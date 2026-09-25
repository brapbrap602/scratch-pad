// Sentence assets and manifest sections stay reusable; controls address listening groups.
export const createNarrationGroups = (sections) => {
  const groups = new Map();
  for (const section of sections) {
    const id = section.id.replace(
      /((?:^welcome\/(?:objective|prerequisite|requirement|vocabulary))|(?:\/instruction))\/\d+$/,
      '$1',
    );
    if (!groups.has(id)) groups.set(id, { id, sentences: [] });
    groups.get(id).sentences.push(...section.sentences);
  }
  return groups;
};
