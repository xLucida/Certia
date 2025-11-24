import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { Employee } from "@shared/schema";

const talentInviteSchema = z.object({
  workArea: z.string().min(1, "Work area is required"),
  headline: z.string().min(1, "Headline is required"),
  locationCity: z.string().optional(),
  locationRegion: z.string().optional(),
  travelRadiusKm: z.string().optional(),
  shiftPreferences: z.array(z.string()).default([]),
  weeklyHoursBand: z.string().optional(),
  germanLevel: z.string().default("UNKNOWN"),
  englishLevel: z.string().default("UNKNOWN"),
  isActivelyLooking: z.boolean().default(false),
  availableFrom: z.string().optional(),
  consent: z.boolean().refine(val => val === true, "You must confirm consent to proceed"),
});

type TalentInviteForm = z.infer<typeof talentInviteSchema>;

const WORK_AREAS = [
  { value: "CLEANING", label: "Cleaning" },
  { value: "STADIUM_EVENTS", label: "Stadium & Events" },
  { value: "CATERING", label: "Catering" },
  { value: "WAREHOUSE", label: "Warehouse & Logistics" },
  { value: "RETAIL", label: "Retail" },
  { value: "CARE", label: "Care" },
  { value: "OTHER", label: "Other" },
];

const TRAVEL_RADIUS = [
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
];

const LANGUAGE_LEVELS = [
  { value: "NONE", label: "None" },
  { value: "BASIC", label: "Basic" },
  { value: "GOOD", label: "Good" },
  { value: "FLUENT", label: "Fluent" },
  { value: "UNKNOWN", label: "Not specified" },
];

const WEEKLY_HOURS = [
  { value: "UNDER_20", label: "< 20 hours" },
  { value: "H20_30", label: "20-30 hours" },
  { value: "OVER_30", label: "30+ hours" },
  { value: "UNKNOWN", label: "Not specified" },
];

const SHIFT_OPTIONS = [
  { id: "DAY", label: "Day" },
  { id: "EVENING", label: "Evening" },
  { id: "NIGHT", label: "Night" },
  { id: "WEEKEND", label: "Weekends" },
];

interface TalentInviteDialogProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TalentInviteDialog({ employee, open, onOpenChange, onSuccess }: TalentInviteDialogProps) {
  const { toast } = useToast();
  const [shiftPreferences, setShiftPreferences] = useState<string[]>([]);

  const form = useForm<TalentInviteForm>({
    resolver: zodResolver(talentInviteSchema),
    defaultValues: {
      workArea: "",
      headline: "",
      locationCity: "",
      locationRegion: "",
      travelRadiusKm: "",
      shiftPreferences: [],
      weeklyHoursBand: "UNKNOWN",
      germanLevel: "UNKNOWN",
      englishLevel: "UNKNOWN",
      isActivelyLooking: false,
      availableFrom: "",
      consent: false,
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: TalentInviteForm) => {
      const response = await apiRequest("POST", "/api/talent/invite", {
        employeeId: employee.id,
        headline: data.headline,
        workArea: data.workArea,
        locationCity: data.locationCity || undefined,
        locationRegion: data.locationRegion || undefined,
        travelRadiusKm: data.travelRadiusKm || undefined,
        shiftPreferences: data.shiftPreferences,
        weeklyHoursBand: data.weeklyHoursBand,
        germanLevel: data.germanLevel,
        englishLevel: data.englishLevel,
        isActivelyLooking: data.isActivelyLooking,
        availableFrom: data.availableFrom || undefined,
        setVisible: true,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talent"] });
      toast({
        title: "Success",
        description: "Employee invited to Talent pool successfully.",
      });
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to invite to Talent pool.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TalentInviteForm) => {
    inviteMutation.mutate(data);
  };

  // Generate default headline based on work area
  const workArea = form.watch("workArea");
  const handleWorkAreaChange = (value: string) => {
    form.setValue("workArea", value);
    
    // Auto-suggest headline based on work area
    const headlineSuggestions: Record<string, string> = {
      CLEANING: "Cleaning staff",
      STADIUM_EVENTS: "Stadium & events staff",
      CATERING: "Catering staff",
      WAREHOUSE: "Warehouse & logistics staff",
      RETAIL: "Retail staff",
      CARE: "Care worker",
      OTHER: "General worker",
    };
    
    if (!form.getValues("headline") && headlineSuggestions[value]) {
      form.setValue("headline", headlineSuggestions[value]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-talent-invite">
        <DialogHeader>
          <DialogTitle>Add to Talent pool</DialogTitle>
          <DialogDescription>
            Create a simple profile so {employee.firstName} {employee.lastName} can appear in your visa-friendly Talent pool. All right-to-work information stays inside Certia.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="workArea"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work area *</FormLabel>
                  <Select onValueChange={handleWorkAreaChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-work-area">
                        <SelectValue placeholder="Select work area" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WORK_AREAS.map((area) => (
                        <SelectItem key={area.value} value={area.value}>
                          {area.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="headline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headline *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Stadium staff / cleaner" data-testid="input-headline" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="locationCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Berlin" data-testid="input-location-city" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="locationRegion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Berlin" data-testid="input-location-region" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="travelRadiusKm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Travel radius</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-travel-radius">
                        <SelectValue placeholder="Not specified" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRAVEL_RADIUS.map((radius) => (
                        <SelectItem key={radius.value} value={radius.value}>
                          {radius.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shiftPreferences"
              render={() => (
                <FormItem>
                  <FormLabel>Shift preferences</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {SHIFT_OPTIONS.map((shift) => (
                      <FormItem key={shift.id} className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={shiftPreferences.includes(shift.id)}
                            onCheckedChange={(checked) => {
                              const updated = checked
                                ? [...shiftPreferences, shift.id]
                                : shiftPreferences.filter((s) => s !== shift.id);
                              setShiftPreferences(updated);
                              form.setValue("shiftPreferences", updated);
                            }}
                            data-testid={`checkbox-shift-${shift.id.toLowerCase()}`}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{shift.label}</FormLabel>
                      </FormItem>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weeklyHoursBand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weekly hours</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-weekly-hours">
                        <SelectValue placeholder="Not specified" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WEEKLY_HOURS.map((hours) => (
                        <SelectItem key={hours.value} value={hours.value}>
                          {hours.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="germanLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>German level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-german-level">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGE_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="englishLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>English level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-english-level">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGE_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActivelyLooking"
              render={({ field }) => (
                <FormItem className="flex items-start space-x-2 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-actively-looking"
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Actively looking for work
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availableFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available from (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      placeholder="Leave blank for immediately available"
                      data-testid="input-available-from"
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">Leave blank if available immediately</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consent"
              render={({ field }) => (
                <FormItem className="flex items-start space-x-2 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-consent"
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    I confirm this person has agreed to be included in the Certia Talent pool.
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-invite"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                data-testid="button-invite-submit"
              >
                {inviteMutation.isPending ? "Inviting..." : "Invite"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
