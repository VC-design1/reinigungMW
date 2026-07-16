import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  CLEANING_JOB_STATUS_LABELS,
  ISSUE_CATEGORY_LABELS,
  type Apartment,
  type CleaningJobStatus,
  type IssueCategory,
} from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 16 },
  jobHeader: {
    fontSize: 12,
    marginTop: 16,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: "1 solid #cbd5e1",
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginTop: 6, marginBottom: 3 },
  item: { marginBottom: 2 },
  issue: { marginBottom: 4, padding: 4, backgroundColor: "#fef2f2" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  photo: { width: 90, height: 90, objectFit: "cover" },
  photoCaption: { fontSize: 7, color: "#64748b", marginTop: 2 },
});

export interface ReportJob {
  id: string;
  scheduled_date: string;
  status: CleaningJobStatus;
  cleanerName: string | null;
  results: { room_name: string; label: string; checked: boolean; note: string | null }[];
  issues: { category: IssueCategory; description: string; priority: string }[];
  photos: { url: string | null; room_name: string; phase: string }[];
}

export function ApartmentReportDocument({
  apartment,
  jobs,
  from,
  to,
}: {
  apartment: Apartment;
  jobs: ReportJob[];
  from: string;
  to: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Zustandsbericht — {apartment.name}</Text>
        <Text style={styles.subtitle}>
          {apartment.address} · Zeitraum {format(parseISO(from), "d.MM.yyyy")} –{" "}
          {format(parseISO(to), "d.MM.yyyy")}
        </Text>

        {jobs.length === 0 && <Text>Keine Reinigungen im gewählten Zeitraum.</Text>}

        {jobs.map((job) => (
          <View key={job.id} wrap={false}>
            <View style={styles.row}>
              <Text style={styles.jobHeader}>
                {format(parseISO(job.scheduled_date), "EEEE, d. MMMM yyyy", { locale: de })} —{" "}
                {CLEANING_JOB_STATUS_LABELS[job.status]}
                {job.cleanerName ? ` · ${job.cleanerName}` : ""}
              </Text>
            </View>

            {job.results.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Checkliste</Text>
                {job.results.map((r, i) => (
                  <Text key={i} style={styles.item}>
                    {r.checked ? "[x]" : "[ ]"} {r.room_name}: {r.label}
                    {r.note ? ` — ${r.note}` : ""}
                  </Text>
                ))}
              </View>
            )}

            {job.issues.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Gemeldete Probleme</Text>
                {job.issues.map((issue, i) => (
                  <View key={i} style={styles.issue}>
                    <Text>
                      {ISSUE_CATEGORY_LABELS[issue.category]} ({issue.priority === "critical" ? "kritisch" : "normal"})
                    </Text>
                    <Text>{issue.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {job.photos.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Fotos</Text>
                <View style={styles.photoGrid}>
                  {job.photos
                    .filter((p) => p.url)
                    .map((p, i) => (
                      <View key={i}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Image src={p.url!} style={styles.photo} />
                        <Text style={styles.photoCaption}>
                          {p.room_name} · {p.phase}
                        </Text>
                      </View>
                    ))}
                </View>
              </View>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}

/**
 * Kept separate from the route handler (which must stay plain .ts) since
 * only .tsx files can contain JSX for the <ApartmentReportDocument /> element.
 */
export function renderApartmentReportPdf(props: {
  apartment: Apartment;
  jobs: ReportJob[];
  from: string;
  to: string;
}) {
  return renderToBuffer(<ApartmentReportDocument {...props} />);
}
