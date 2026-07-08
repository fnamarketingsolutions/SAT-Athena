"use client";

import { useState } from "react";
import { Calculator, X, Eye, EyeOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ToolbarProps = {
  displayTime: string;
  isLow: boolean;
  timerHidden: boolean;
  onToggleTimer: () => void;
  calcOpen: boolean;
  onToggleCalc: () => void;
  onClose: () => void;
  hasAnswers: boolean;
  subtopicName: string;
  /** Hide entire timer section (default true) */
  showTimer?: boolean;
  /** Hide calculator button (default true) */
  showCalc?: boolean;
  /** Override the subtitle displayed next to Directions */
  title?: string;
  /** Optional skip action — renders a "Skip" button next to the calculator */
  onSkip?: () => void;
  /** Label for the skip button */
  skipLabel?: string;
};

export function Toolbar({
  displayTime,
  isLow,
  timerHidden,
  onToggleTimer,
  calcOpen,
  onToggleCalc,
  onClose,
  hasAnswers,
  subtopicName,
  showTimer = true,
  showCalc = true,
  title,
  onSkip,
  skipLabel = "Skip",
}: ToolbarProps) {
  const [showDirections, setShowDirections] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const handleClose = () => {
    if (hasAnswers) {
      setConfirmExit(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-1 border-b border-border bg-card px-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-1 justify-self-start sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDirections((d) => !d)}
            className="shrink-0 border-primary/30 px-2 text-primary sm:px-3"
            aria-label="Directions"
          >
            <BookOpen className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Directions</span>
          </Button>
          <span className="truncate text-xs text-muted-foreground sm:text-sm">
            {title ?? subtopicName}
          </span>
        </div>

        {showTimer && (
          <div className="flex shrink-0 items-center gap-1 justify-self-center sm:gap-2">
            {!timerHidden && (
              <span
                className={cn(
                  "font-mono text-sm font-semibold tabular-nums sm:text-lg",
                  isLow && "text-destructive animate-pulse"
                )}
              >
                {displayTime}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={onToggleTimer}>
              {timerHidden ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1 justify-self-end">
          {onSkip && (
            <Button variant="outline" size="sm" onClick={onSkip} className="mr-1 text-xs">
              {skipLabel}
            </Button>
          )}
          {showCalc && (
            <Button
              variant={calcOpen ? "secondary" : "ghost"}
              size="icon"
              onClick={onToggleCalc}
            >
              <Calculator className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showDirections && (
        <div className="border-b bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Directions</p>
          <p>
            Answer each question by selecting the best answer from the choices
            provided. You can navigate freely between questions using the Back
            and Next buttons or the question navigator. Mark questions for
            review if you want to revisit them. When you are finished, click
            Submit to see your results.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setShowDirections(false)}
          >
            Close Directions
          </Button>
        </div>
      )}

      <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit Quiz?</DialogTitle>
            <DialogDescription>
              You have unsaved answers. Your progress will be lost if you exit
              now.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmExit(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onClose}>
              Exit Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
