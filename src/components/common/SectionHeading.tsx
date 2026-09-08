import React from 'react';

interface SectionHeadingProps {
    icon?: React.ComponentType<{ size?: number; className?: string }>;
    children: React.ReactNode;
    className?: string;
}

/**
 * Standard treatment for a major section heading within a page (as distinct
 * from small uppercase eyebrow labels, which stay as they are for table
 * headers / field labels / metadata). 16-18px semibold navy, optional icon.
 */
export default function SectionHeading({ icon: Icon, children, className }: SectionHeadingProps) {
    return (
        <h2 className={`flex items-center gap-2 text-[17px] font-semibold text-[#0E2B5C] ${className ?? ''}`}>
            {Icon && <Icon size={18} className="text-[#00458B]" />}
            {children}
        </h2>
    );
}
