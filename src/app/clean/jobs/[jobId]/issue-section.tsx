"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { issueReportSchema, type IssueReportInput } from "@/lib/validation/issue";
import type { IssueReport } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface Props {
  issues: IssueReport[];
  onSubmit: (input: IssueReportInput) => Promise<void>;
  disabled?: boolean;
  dict: Dictionary;
}

export function IssueSection({ issues, onSubmit, disabled, dict }: Props) {
  const [showForm, setShowForm] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IssueReportInput>({
    resolver: zodResolver(issueReportSchema),
    defaultValues: { category: "damage", description: "" },
  });

  async function submit(values: IssueReportInput) {
    await onSubmit(values);
    reset();
    setShowForm(false);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{dict.job.issues}</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          {showForm ? dict.job.issueCancel : dict.job.issueReport}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {showForm && (
          <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-3 rounded-md border border-slate-200 p-3">
            <Select disabled={disabled} {...register("category")}>
              {Object.entries(dict.issueCategories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Textarea
              placeholder={dict.job.issueDescriptionPlaceholder}
              disabled={disabled}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
            <Button type="submit" disabled={disabled || isSubmitting}>
              {isSubmitting ? dict.job.issueSubmitting : dict.job.issueSubmit}
            </Button>
          </form>
        )}

        {issues.length === 0 ? (
          <p className="text-sm text-slate-400">{dict.job.issuesEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-start gap-2 rounded-md border border-slate-200 p-3">
                {issue.priority === "critical" && (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={issue.priority === "critical" ? "red" : "default"}>
                      {dict.issueCategories[issue.category]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{issue.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
