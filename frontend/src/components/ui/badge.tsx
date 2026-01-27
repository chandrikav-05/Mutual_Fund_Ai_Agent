import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { badgeVariants } from "./badge-variants"

function Badge({
    className,
    variant,
    asChild = false,
    showCircle = false,
    children,
    ...props
}: React.ComponentProps<"span"> &
    VariantProps<typeof badgeVariants> & { asChild?: boolean; showCircle?: boolean }) {
    const Comp = asChild ? Slot : "span"

    return (
        <Comp
            data-slot="badge"
            className={cn(badgeVariants({ variant }), className)}
            {...props}
        >
            {showCircle && <span className="w-2 h-2 rounded-full bg-[#00C950]" />}
            {children}
        </Comp>
    )
}

export { Badge, badgeVariants }
