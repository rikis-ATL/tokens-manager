'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const CONTACT_EMAIL = 'tokenflow666@gmail.com';

type PaidTiersComingSoonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PaidTiersComingSoonDialog({
  open,
  onOpenChange,
}: PaidTiersComingSoonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        marketing
        className="max-w-md"
        data-testid="paid-tiers-coming-soon-dialog"
      >
        <DialogHeader>
          <DialogTitle>Paid plans coming soon</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            TokenFlow is in an active testing stage. Pro and Team tiers are not available for
            checkout yet.
          </p>
          <p>
            In the meantime, use the free tier or shared demo. For dedicated upgrades or
            self-hosting, get in touch and we can help you get set up.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild>
            <a href={`mailto:${CONTACT_EMAIL}?subject=TokenFlow upgrade or self-hosting`}>
              Contact us
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
