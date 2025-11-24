import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { Link } from "wouter";
import { Users, MapPin, Clock, Calendar, Languages, FileCheck, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { TalentProfile } from "@shared/schema";

type TalentProfileWithEmployee = TalentProfile & {
  employee: {
    id: number;
    firstName: string;
    lastName: string;
  };
};

const WORK_AREAS = [
  { value: "CLEANING", label: "Cleaning" },
  { value: "STADIUM_EVENTS", label: "Stadium Events" },
  { value: "CATERING", label: "Catering" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "RETAIL", label: "Retail" },
  { value: "CARE", label: "Care" },
  { value: "OTHER", label: "Other" },
];

const SHIFT_PREFERENCES = [
  { value: "DAY", label: "Day" },
  { value: "EVENING", label: "Evening" },
  { value: "NIGHT", label: "Night" },
  { value: "WEEKEND", label: "Weekend" },
];

const WEEKLY_HOURS_BANDS = [
  { value: "UNDER_20", label: "Under 20h" },
  { value: "H20_30", label: "20-30h" },
  { value: "OVER_30", label: "Over 30h" },
];

const PERMIT_HORIZONS = [
  { value: "UNDER_6", label: "Under 6 months" },
  { value: "M6_12", label: "6-12 months" },
  { value: "M12_24", label: "12-24 months" },
  { value: "OVER_24M", label: "Over 24 months" },
  { value: "UNKNOWN", label: "Unknown" },
];

function getPermitBadgeVariant(horizon: string | null | undefined): "default" | "secondary" | "outline" {
  if (!horizon || horizon === "UNKNOWN") return "outline";
  if (horizon === "UNDER_6") return "outline";
  if (horizon === "M6_12") return "secondary";
  return "default";
}

function formatPermitHorizon(horizon: string | null | undefined): string {
  if (!horizon || horizon === "UNKNOWN") return "Permit horizon: Unknown";
  const horizonMap: Record<string, string> = {
    OVER_24M: "Permit horizon: ~24+ months",
    M12_24: "Permit horizon: ~12–24 months",
    M6_12: "Permit horizon: ~6–12 months",
    UNDER_6: "Permit horizon: < 6 months",
  };
  return horizonMap[horizon] || "Permit horizon: Unknown";
}

function getPermitHorizonColor(horizon: string | null | undefined): string {
  if (!horizon || horizon === "UNKNOWN") return "text-muted-foreground";
  if (horizon === "UNDER_6") return "text-red-600";
  if (horizon === "M6_12") return "text-amber-600";
  return "text-muted-foreground";
}

function formatWeeklyHours(band: string | null | undefined): string {
  if (!band) return "Not specified";
  const item = WEEKLY_HOURS_BANDS.find(h => h.value === band);
  return item?.label || band;
}

function formatLanguageLevel(level: string | null | undefined): string {
  if (!level || level === "UNKNOWN") return "—";
  const levels: Record<string, string> = {
    NONE: "None",
    BASIC: "Basic",
    GOOD: "Good",
    FLUENT: "Fluent",
  };
  return levels[level] || level;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("de-DE");
}

function getDaysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getRTWBadgeText(status: string | null | undefined, checkDate: Date | string | null | undefined): string {
  if (!status) return "ℹ️ Work authorization must be checked before hire";
  
  const daysSince = getDaysSince(checkDate);
  
  if (status === "ELIGIBLE") {
    if (daysSince !== null && daysSince <= 90) {
      return "✅ Work authorization verified via Certia (≤ 90 days)";
    }
    return "🟡 Work authorization verified via Certia (> 90 days – refresh on hire)";
  }
  
  if (status === "NEEDS_REVIEW") {
    return "⚠️ Right-to-work check exists – review required on hire";
  }
  
  return "ℹ️ Work authorization must be checked before hire";
}

export default function Talent() {
  const [workAreaFilter, setWorkAreaFilter] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [shiftFilter, setShiftFilter] = useState<string>("");
  const [hoursFilter, setHoursFilter] = useState<string>("");
  const [permitFilter, setPermitFilter] = useState<string>("");
  const [activelyLookingFilter, setActivelyLookingFilter] = useState<boolean>(false);

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (workAreaFilter) queryParams.append("workArea", workAreaFilter);
  if (locationFilter) queryParams.append("locationCity", locationFilter);
  if (shiftFilter) queryParams.append("shift", shiftFilter);
  if (hoursFilter) queryParams.append("weeklyHoursBand", hoursFilter);
  if (permitFilter) queryParams.append("permitHorizonBand", permitFilter);
  if (activelyLookingFilter) queryParams.append("isActivelyLooking", "true");
  const queryString = queryParams.toString();
  const queryUrl = queryString ? `/api/talent?${queryString}` : "/api/talent";

  const { data: profiles, isLoading } = useQuery<TalentProfileWithEmployee[]>({
    queryKey: [queryUrl],
  });

  const filteredProfiles = profiles || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <PageHeader
        kicker="Certia Talent"
        title="Talent pool (work visas)"
        description="Shift-based workers on German work visas for cleaning, stadiums, catering, warehouse and more. All profiles are linked to structured right-to-work checks in Certia."
        icon={<Users className="h-5 w-5" />}
      />

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Select value={workAreaFilter || "CLEAR_FILTER"} onValueChange={(val) => setWorkAreaFilter(val === "CLEAR_FILTER" ? "" : val)}>
                <SelectTrigger data-testid="filter-work-area">
                  <SelectValue placeholder="All Work Areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLEAR_FILTER">All Work Areas</SelectItem>
                  {WORK_AREAS.map(area => (
                    <SelectItem key={area.value} value={area.value}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Location (city or region)"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                data-testid="filter-location"
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={shiftFilter || "CLEAR_FILTER"} onValueChange={(val) => setShiftFilter(val === "CLEAR_FILTER" ? "" : val)}>
                <SelectTrigger data-testid="filter-shift">
                  <SelectValue placeholder="All Shifts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLEAR_FILTER">All Shifts</SelectItem>
                  {SHIFT_PREFERENCES.map(shift => (
                    <SelectItem key={shift.value} value={shift.value}>
                      {shift.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={hoursFilter || "CLEAR_FILTER"} onValueChange={(val) => setHoursFilter(val === "CLEAR_FILTER" ? "" : val)}>
                <SelectTrigger data-testid="filter-hours">
                  <SelectValue placeholder="All Hours" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLEAR_FILTER">All Hours</SelectItem>
                  {WEEKLY_HOURS_BANDS.map(band => (
                    <SelectItem key={band.value} value={band.value}>
                      {band.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={permitFilter || "CLEAR_FILTER"} onValueChange={(val) => setPermitFilter(val === "CLEAR_FILTER" ? "" : val)}>
                <SelectTrigger data-testid="filter-permit">
                  <SelectValue placeholder="All Permits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLEAR_FILTER">All Permits</SelectItem>
                  {PERMIT_HORIZONS.map(horizon => (
                    <SelectItem key={horizon.value} value={horizon.value}>
                      {horizon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="actively-looking"
                checked={activelyLookingFilter}
                onCheckedChange={(checked) => setActivelyLookingFilter(checked as boolean)}
                data-testid="checkbox-filter-actively-looking"
              />
              <Label htmlFor="actively-looking" className="font-normal cursor-pointer">
                Only actively looking
              </Label>
            </div>

            {(workAreaFilter || locationFilter || shiftFilter || hoursFilter || permitFilter || activelyLookingFilter) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setWorkAreaFilter("");
                  setLocationFilter("");
                  setShiftFilter("");
                  setHoursFilter("");
                  setPermitFilter("");
                  setActivelyLookingFilter(false);
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {workAreaFilter || locationFilter || shiftFilter || hoursFilter || permitFilter
                ? "No talent profiles match your filters"
                : "No talent profiles yet. Invite employees from their detail page."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProfiles.map((profile) => (
            <Card key={profile.id} className="hover-elevate" data-testid={`talent-card-${profile.id}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3">
                  <div className="flex-1">
                    <Link href={`/employees/${profile.employee.id}`}>
                      <h3 className="font-semibold text-lg hover:underline" data-testid={`talent-name-${profile.id}`}>
                        {profile.employee.firstName} {profile.employee.lastName}
                      </h3>
                    </Link>
                    {profile.headline && (
                      <p className="text-sm text-muted-foreground mt-1" data-testid={`talent-headline-${profile.id}`}>
                        {profile.headline}
                      </p>
                    )}
                  </div>
                  
                  {profile.isActivelyLooking === "true" && (
                    <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                      <span>✓ Actively looking</span>
                    </div>
                  )}
                  
                  {profile.availableFrom ? (
                    <div className="text-sm text-muted-foreground">
                      Available from: {formatDate(profile.availableFrom)}
                    </div>
                  ) : profile.isActivelyLooking === "true" ? (
                    <div className="text-sm text-muted-foreground">
                      Available now
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {WORK_AREAS.find(a => a.value === profile.workArea)?.label || profile.workArea}
                  </span>
                </div>

                {(profile.locationCity || profile.locationRegion) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {[profile.locationCity, profile.locationRegion].filter(Boolean).join(", ")}
                      {profile.travelRadiusKm && ` (+${profile.travelRadiusKm}km)`}
                    </span>
                  </div>
                )}

                {profile.shiftPreferencesList && profile.shiftPreferencesList.length > 0 && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {profile.shiftPreferencesList.map((shift: string) => (
                        <Badge key={shift} variant="secondary" className="text-xs">
                          {SHIFT_PREFERENCES.find(s => s.value === shift)?.label || shift}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formatWeeklyHours(profile.weeklyHoursBand)}/week</span>
                </div>

                {(profile.germanLevel || profile.englishLevel) && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Languages className="h-4 w-4 mt-0.5" />
                    <div className="flex gap-4">
                      {profile.germanLevel && (
                        <div className="flex gap-1">
                          <span className="font-medium">German:</span>
                          <span>{formatLanguageLevel(profile.germanLevel)}</span>
                        </div>
                      )}
                      {profile.englishLevel && (
                        <div className="flex gap-1">
                          <span className="font-medium">English:</span>
                          <span>{formatLanguageLevel(profile.englishLevel)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t space-y-1.5">
                  <div className="text-xs text-muted-foreground">
                    {getRTWBadgeText(profile.lastCheckStatus, profile.lastCheckDate)}
                  </div>
                  
                  {profile.lastCheckDate && (
                    <div className="text-xs text-muted-foreground">
                      Checked {getDaysSince(profile.lastCheckDate)} days ago
                    </div>
                  )}
                  
                  <div className={`text-xs font-medium ${getPermitHorizonColor(profile.permitHorizonBand)}`}>
                    {formatPermitHorizon(profile.permitHorizonBand)}
                  </div>
                </div>

                <Link href={`/employees/${profile.employee.id}`}>
                  <Button variant="outline" className="w-full mt-2" data-testid={`button-view-profile-${profile.id}`}>
                    View Full Profile
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
