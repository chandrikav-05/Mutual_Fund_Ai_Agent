import type { SVGProps, ReactNode } from "react"

export interface Iphone17ProProps extends SVGProps<SVGSVGElement> {
    width?: number
    height?: number
    src?: string
    children?: ReactNode
}

export function Iphone17Pro({
    width = 433,
    height = 882,
    src,
    children,
    ...props
}: Iphone17ProProps) {
    // Screen dimensions relative to 433x882 viewBox
    const screenX = 21.25
    const screenY = 19.25
    const screenWidth = 390
    const screenHeight = 844
    const screenRadius = 55

    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 433 882"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            {/* Phone frame outer */}
            <path
                fill="#1C1C1E"
                d="M2 73C2 32.6832 34.6832 0 75 0H357C397.317 0 430 32.6832 430 73V809C430 849.317 397.317 882 357 882H75C34.6832 882 2 849.317 2 809V73Z"
            />

            {/* Side buttons */}
            <path fill="#1C1C1E" d="M0 171C0 167.686 2.68629 165 6 165H2V286H6C2.68629 286 0 283.314 0 280V171Z" />
            <path fill="#1C1C1E" d="M0 310C0 306.686 2.68629 304 6 304H2V370H6C2.68629 370 0 367.314 0 364V310Z" />
            <path fill="#1C1C1E" d="M0 390C0 386.686 2.68629 384 6 384H2V450H6C2.68629 450 0 447.314 0 444V390Z" />
            <path fill="#1C1C1E" d="M430 279C430 275.686 427.314 273 424 273H430V377H424C427.314 377 430 374.314 430 371V279Z" />

            {/* Screen background */}
            <rect
                x={screenX}
                y={screenY}
                width={screenWidth}
                height={screenHeight}
                rx={screenRadius}
                fill="#000000"
            />

            {/* Clipping path for screen content */}
            <defs>
                <clipPath id="screenClip">
                    <rect
                        x={screenX}
                        y={screenY}
                        width={screenWidth}
                        height={screenHeight}
                        rx={screenRadius}
                    />
                </clipPath>
            </defs>

            {/* Screen content area */}
            <g clipPath="url(#screenClip)">
                {/* Image source if provided */}
                {src && (
                    <image
                        href={src}
                        x={screenX}
                        y={screenY}
                        width={screenWidth}
                        height={screenHeight}
                        preserveAspectRatio="xMidYMid slice"
                    />
                )}

                {/* React children rendered via foreignObject */}
                {children && (
                    <foreignObject
                        x={screenX}
                        y={screenY}
                        width={screenWidth}
                        height={screenHeight}
                    >
                        <div
                            style={{
                                width: "100%",
                                height: "100%",
                                overflow: "hidden",
                                borderRadius: `${screenRadius}px`,
                                background: "#000",
                            }}
                        >
                            {children}
                        </div>
                    </foreignObject>
                )}
            </g>

            {/* Dynamic Island */}
            <rect
                x="154"
                y="29"
                width="126"
                height="37"
                rx="18.5"
                fill="#000000"
            />

            {/* Camera lens */}
            <circle cx="254" cy="47.5" r="6" fill="#1C1C1E" />
            <circle cx="254" cy="47.5" r="4" fill="#2C2C2E" />
        </svg>
    )
}
