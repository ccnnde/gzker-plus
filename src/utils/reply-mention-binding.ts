import type { ReplyMentionBinding, TrackedReplyMention } from '@/types';

const isMentionBoundary = (character: string | undefined): boolean => {
  return character === undefined || /\s/.test(character) || '*_~()[]'.includes(character);
};

const findUniqueMention = (draft: string, label: string) => {
  let match: TrackedReplyMention['range'];
  let start = draft.indexOf(label);

  while (start !== -1) {
    const end = start + label.length;

    if (isMentionBoundary(draft[start - 1]) && isMentionBoundary(draft[end])) {
      if (match) {
        return;
      }

      match = { start, end };
    }

    start = draft.indexOf(label, start + 1);
  }

  return match;
};

const overlaps = (first: ReplyMentionBinding, second: ReplyMentionBinding) => {
  return first.start < second.end && second.start < first.end;
};

const hasConflict = (binding: ReplyMentionBinding, bindings: ReplyMentionBinding[]) => {
  return bindings.some((other) => {
    return other !== binding && overlaps(binding, other);
  });
};

export const resolveMentionBindings = (draft: string, mentions: TrackedReplyMention[]): ReplyMentionBinding[] => {
  const confirmed: ReplyMentionBinding[] = [];
  const unresolved = new Map<string, TrackedReplyMention[]>();

  for (const mention of mentions) {
    const { uid, reply_id, label, range } = mention;

    if (range && draft.slice(range.start, range.end) === label) {
      confirmed.push({ uid, reply_id, label, ...range });
      continue;
    }

    const sameLabel = unresolved.get(label);

    if (sameLabel) {
      sameLabel.push(mention);
    } else {
      unresolved.set(label, [mention]);
    }
  }

  const candidates: ReplyMentionBinding[] = [];

  for (const [label, records] of unresolved) {
    const [record] = records;

    if (!record || records.length !== 1) {
      continue;
    }

    const range = findUniqueMention(draft, label);

    if (range) {
      const { uid, reply_id } = record;
      candidates.push({ uid, reply_id, label, ...range });
    }
  }

  const recovered = candidates.filter((candidate) => {
    const occupied = confirmed.some((binding) => {
      return overlaps(candidate, binding);
    });

    return !occupied && !hasConflict(candidate, candidates);
  });

  const valid = confirmed.filter((binding) => {
    return !hasConflict(binding, confirmed);
  });

  return [...valid, ...recovered].sort((a, b) => {
    return a.start - b.start;
  });
};
