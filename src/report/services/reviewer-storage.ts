import type { JsonObject, ReviewerChecklistItem, ReviewerState } from "../types";

export const COMMON_REQUIRED_CHECKLIST: ReviewerChecklistItem[] = [
  { id: "COMMON-01", label: "입력 근거자료의 최신성과 적용 범위를 확인", checked: false },
  { id: "COMMON-02", label: "기존 보험·중복보상·구상 관계를 검토", checked: false },
  { id: "COMMON-03", label: "상품·약관·법무 검토 담당과 역할을 확정", checked: false },
  { id: "COMMON-04", label: "추가 자료와 계리 검토의 범위를 합의", checked: false },
];

export interface ReviewerStorage {
  load(key: string): ReviewerState | null;
  save(key: string, state: ReviewerState): void;
  clear(key: string): void;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseChecklist = (value: unknown): ReviewerChecklistItem[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const checklist = value.filter(
    (item): item is ReviewerChecklistItem =>
      isRecord(item) &&
      typeof item.id === "string" &&
      typeof item.label === "string" &&
      typeof item.checked === "boolean",
  );

  return checklist.length === value.length ? checklist : null;
};

const parseReviewerState = (value: unknown): ReviewerState | null => {
  if (!isRecord(value)) {
    return null;
  }

  const checklist = parseChecklist(value.checklist);
  const statusOptions = Array.isArray(value.statusOptions)
    ? value.statusOptions.filter((item): item is string => typeof item === "string")
    : null;

  if (
    typeof value.status !== "string" ||
    !statusOptions ||
    !checklist ||
    typeof value.memo !== "string" ||
    (typeof value.savedAt !== "string" && value.savedAt !== null) ||
    typeof value.localStorageKey !== "string"
  ) {
    return null;
  }

  return {
    status: value.status,
    statusOptions,
    checklist,
    memo: value.memo,
    savedAt: value.savedAt,
    localStorageKey: value.localStorageKey,
  };
};

export const createReviewerStorage = (
  storageProvider: () => StorageLike | null,
): ReviewerStorage => ({
  load(key) {
    try {
      const raw = storageProvider()?.getItem(key);
      if (!raw) {
        return null;
      }
      return parseReviewerState(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  },
  save(key, state) {
    try {
      storageProvider()?.setItem(key, JSON.stringify(state));
    } catch {
      // 저장소 차단·용량 초과 시 화면 상태는 유지하고 영속화만 건너뛴다.
    }
  },
  clear(key) {
    try {
      storageProvider()?.removeItem(key);
    } catch {
      // 저장소를 사용할 수 없어도 리포트 기능 자체는 계속 동작한다.
    }
  },
});

export const browserReviewerStorage: ReviewerStorage = createReviewerStorage(() => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
});
