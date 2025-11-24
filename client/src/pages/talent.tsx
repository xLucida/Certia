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
  { value: "WAREHOUSING", label: "Warehousing" },
  { value: "RETAIL", label: "Retail" },
  { value: "LOGISTICS", label: "Logistics" },
  { value: "HOSPITALITY", label: "Hospitality" },
  { value: "OTHER", label: "Other" },
];

const SHIFT_PREFERENCES = [
  { value: "MORNING", label: "Morning" },
  { value: "AFTERNOON", label: "Afternoon" },
  { value: "EVENING", label: "Evening" },
  { value: "NIGHT", label: "Night" },
  { value: "WEEKEND", label: "Weekend" },
];

const WEEKLY_HOURS_BANDS = [
  { value: "UNDER_20", label: "Under 20h" },
  { value: "H20_30", label: "20-30h" },
  { value: "H30_40", label: "30-40h" },
  { value: "OVER_40", label: "Over 40h" },
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
  if (!horizon) return "Unknown";
  const item = PERMIT_HORIZONS.find(h => h.value === horizon);
  return item?.label || horizon;
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

export default function Talent() {
  const [workAreaFilter, setWorkAreaFilter] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [shiftFilter, setShiftFilter] = useState<string>("");
  const [hoursFilter, setHoursFilter] = useState<string>("");
  const [permitFilter, setPermitFilter] = useState<string>("");

  const { data: profiles, isLoading } = useQuery<TalentProfileWithEmployee[]>({
    queryKey: ["/api/talent", { 
      workArea: workAreaFilter || undefined, 
      location: locationFilter || undefined,
      shift: shiftFilter || undefined,
      hours: hoursFilter || undefined,
      permit: permitFilter || undefined,
    }],
  });

  const filteredProfiles = profiles || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <PageHeader
        kicker="Certia Talent"
        title="Talent Pool"
        description="Internal pool of shift-based workers with verified work authorization"
        icon={<Users className="h-5 w-5" />}
      />

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Select value={workAreaFilter} onValueChange={setWorkAreaFilter}>
                <SelectTrigger data-testid="filter-work-area">
                  <SelectValue placeholder="Work Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Work Areas</SelectItem>
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
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger data-testid="filter-shift">
                  <SelectValue placeholder="Shift Preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Shifts</SelectItem>
                  {SHIFT_PREFERENCES.map(shift => (
                    <SelectItem key={shift.value} value={shift.value}>
                      {shift.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={hoursFilter} onValueChange={setHoursFilter}>
                <SelectTrigger data-testid="filter-hours">
                  <SelectValue placeholder="Weekly Hours" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Hours</SelectItem>
                  {WEEKLY_HOURS_BANDS.map(band => (
                    <SelectItem key={band.value} value={band.value}>
                      {band.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={permitFilter} onValueChange={setPermitFilter}>
                <SelectTrigger data-testid="filter-permit">
                  <SelectValue placeholder="Permit Horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Permits</SelectItem>
                  {PERMIT_HORIZONS.map(horizon => (
                    <SelectItem key={horizon.value} value={horizon.value}>
                      {horizon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(workAreaFilter || locationFilter || shiftFilter || hoursFilter || permitFilter) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setWorkAreaFilter("");
                  setLocationFilter("");
                  setShiftFilter("");
                  setHoursFilter("");
                  setPermitFilter("");
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((profile) => (
            <Card key={profile.id} className="hover-elevate" data-testid={`talent-card-${profile.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
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
                  <Badge variant={getPermitBadgeVariant(profile.permitHorizonBand)} data-testid={`talent-permit-${profile.id}`}>
                    <FileCheck className="h-3 w-3 mr-1" />
                    {formatPermitHorizon(profile.permitHorizonBand)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
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
                    <div className="space-y-1">
                      {profile.germanLevel && (
                        <div className="flex gap-2">
                          <span className="font-medium">DE:</span>
                          <span>{formatLanguageLevel(profile.germanLevel)}</span>
                        </div>
                      )}
                      {profile.englishLevel && (
                        <div className="flex gap-2">
                          <span className="font-medium">EN:</span>
                          <span>{formatLanguageLevel(profile.englishLevel)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
