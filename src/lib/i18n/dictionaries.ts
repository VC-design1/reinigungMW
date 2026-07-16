export type Locale = "de" | "en";

export const SUPPORTED_LOCALES: Locale[] = ["de", "en"];

export interface Dictionary {
  appName: string;
  logout: string;
  overview: {
    title: string;
    subtitle: string;
    overdue: string;
    today: string;
    todayEmpty: string;
    thisWeek: string;
    thisWeekEmpty: string;
  };
  job: {
    back: string;
    checklist: string;
    checklistEmpty: string;
    noteEdit: string;
    noteAdd: string;
    notePlaceholder: string;
    photos: string;
    photoBefore: string;
    photoAfter: string;
    photoIssue: string;
    issues: string;
    issuesEmpty: string;
    issueReport: string;
    issueCancel: string;
    issueDescriptionPlaceholder: string;
    issueSubmit: string;
    issueSubmitting: string;
    status: string;
    statusStart: string;
    statusComplete: string;
  };
  statusLabels: {
    scheduled: string;
    in_progress: string;
    completed: string;
    problem_reported: string;
  };
  issueCategories: {
    damage: string;
    wear: string;
    missing_item: string;
    cleaning_not_possible: string;
    other: string;
  };
  sync: {
    offline: string;
    pendingSuffix: string;
    syncing: string;
    pending: string;
  };
  scan: {
    // "{date}" placeholder — substitute with the formatted date at the call site.
    // (Kept as a plain string, not a function: this dictionary is passed as a
    // prop from Server to Client Components, and functions aren't serializable
    // across that boundary.)
    noJobToday: string;
    openAnyway: string;
    noJob: string;
    backToOverview: string;
  };
}

export const dictionaries: Record<Locale, Dictionary> = {
  de: {
    appName: "Reinigung",
    logout: "Abmelden",
    overview: {
      title: "Meine Wohnungen",
      subtitle: "Heute und diese Woche",
      overdue: "Überfällig",
      today: "Heute",
      todayEmpty: "Keine Reinigungen für heute geplant.",
      thisWeek: "Diese Woche",
      thisWeekEmpty: "Keine weiteren Termine diese Woche.",
    },
    job: {
      back: "Zurück zur Übersicht",
      checklist: "Checkliste",
      checklistEmpty: "Für diesen Auftrag ist keine Checkliste hinterlegt.",
      noteEdit: "Notiz bearbeiten",
      noteAdd: "Notiz hinzufügen",
      notePlaceholder: "Notiz (optional)",
      photos: "Fotos",
      photoBefore: "Vorher",
      photoAfter: "Nachher",
      photoIssue: "Schaden/Problem",
      issues: "Auffälligkeiten / Schäden",
      issuesEmpty: "Keine Meldungen für diesen Auftrag.",
      issueReport: "Melden",
      issueCancel: "Abbrechen",
      issueDescriptionPlaceholder: "Was ist aufgefallen?",
      issueSubmit: "Meldung senden",
      issueSubmitting: "Wird gemeldet…",
      status: "Status",
      statusStart: "Reinigung starten",
      statusComplete: "Als abgeschlossen markieren",
    },
    statusLabels: {
      scheduled: "Geplant",
      in_progress: "In Bearbeitung",
      completed: "Abgeschlossen",
      problem_reported: "Problem gemeldet",
    },
    issueCategories: {
      damage: "Schaden",
      wear: "Verschleiß",
      missing_item: "Fehlender Gegenstand",
      cleaning_not_possible: "Reinigung nicht möglich",
      other: "Sonstiges",
    },
    sync: {
      offline: "Offline",
      pendingSuffix: "ausstehend",
      syncing: "Synchronisiere…",
      pending: "ausstehend",
    },
    scan: {
      noJobToday: "Für heute ist hier keine Reinigung für dich geplant. Nächster Termin: {date}.",
      openAnyway: "Trotzdem öffnen",
      noJob: "Für diese Wohnung ist aktuell keine Reinigung für dich eingeplant.",
      backToOverview: "Zur Übersicht",
    },
  },
  en: {
    appName: "Cleaning",
    logout: "Log out",
    overview: {
      title: "My apartments",
      subtitle: "Today and this week",
      overdue: "Overdue",
      today: "Today",
      todayEmpty: "No cleanings scheduled for today.",
      thisWeek: "This week",
      thisWeekEmpty: "No further appointments this week.",
    },
    job: {
      back: "Back to overview",
      checklist: "Checklist",
      checklistEmpty: "No checklist has been set up for this job.",
      noteEdit: "Edit note",
      noteAdd: "Add note",
      notePlaceholder: "Note (optional)",
      photos: "Photos",
      photoBefore: "Before",
      photoAfter: "After",
      photoIssue: "Damage/issue",
      issues: "Issues / damage",
      issuesEmpty: "No reports for this job.",
      issueReport: "Report",
      issueCancel: "Cancel",
      issueDescriptionPlaceholder: "What did you notice?",
      issueSubmit: "Submit report",
      issueSubmitting: "Submitting…",
      status: "Status",
      statusStart: "Start cleaning",
      statusComplete: "Mark as completed",
    },
    statusLabels: {
      scheduled: "Scheduled",
      in_progress: "In progress",
      completed: "Completed",
      problem_reported: "Issue reported",
    },
    issueCategories: {
      damage: "Damage",
      wear: "Wear",
      missing_item: "Missing item",
      cleaning_not_possible: "Cleaning not possible",
      other: "Other",
    },
    sync: {
      offline: "Offline",
      pendingSuffix: "pending",
      syncing: "Syncing…",
      pending: "pending",
    },
    scan: {
      noJobToday: "No cleaning is scheduled for you here today. Next appointment: {date}.",
      openAnyway: "Open anyway",
      noJob: "No cleaning is currently scheduled for you at this apartment.",
      backToOverview: "Back to overview",
    },
  },
};

export function getDictionary(locale: string | null | undefined): Dictionary {
  return dictionaries[locale === "en" ? "en" : "de"];
}
