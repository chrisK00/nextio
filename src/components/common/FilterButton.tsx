import { useState, useRef, useCallback } from 'react'
import styles from '../../App.module.css'

type FilterButtonProps = {
    label: string
    active: boolean
    tooltip?: string
    onClick: () => void
}

/**
 * Filter pill that shows a tooltip only while the button is held (500 ms to trigger,
 * hides immediately on release). Tap/click without holding switches the filter.
 */
export default function FilterButton({ label, active, tooltip, onClick }: FilterButtonProps) {
    const [tooltipVisible, setTooltipVisible] = useState(false)
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isHolding = useRef(false)

    const start = useCallback(() => {
        if (!tooltip) return
        isHolding.current = true
        holdTimer.current = setTimeout(() => {
            if (isHolding.current) setTooltipVisible(true)
        }, 500)
    }, [tooltip])

    const end = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (holdTimer.current) clearTimeout(holdTimer.current)
        // If tooltip was showing this was a long-press — suppress the click
        if (isHolding.current && tooltipVisible) {
            e.preventDefault()
        }
        isHolding.current = false
        setTooltipVisible(false)
    }, [tooltipVisible])

    const handleClick = useCallback((e: React.MouseEvent) => {
        // Suppress click after a long-press
        if (tooltipVisible) { e.preventDefault(); return }
        onClick()
    }, [onClick, tooltipVisible])

    return (
        <span style={{ position: 'relative', display: 'inline-block' }}>
            <button
                type="button"
                className={`${styles.sortButton} ${active ? styles.sortButtonActive : ''}`}
                onClick={handleClick}
                onMouseDown={start}
                onMouseUp={end}
                onMouseLeave={end}
                onTouchStart={start}
                onTouchEnd={end}
                onTouchCancel={end}
            >
                {label}
            </button>
            {tooltipVisible && tooltip && (
                <span className={styles.filterTooltip} role="tooltip">
                    {tooltip}
                </span>
            )}
        </span>
    )
}
