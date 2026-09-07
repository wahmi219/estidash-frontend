import type { Metadata } from 'next';
import Image from 'next/image';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
    title: 'Sign In | Estimation Hub',
    description: 'Sign in to the Estimation Hub Market Intelligence Platform',
};

export default function LoginPage() {
    return (
        <main className="min-h-screen flex flex-col lg:flex-row">
            {/*
              Brand panel — hidden below lg, where a compact brand identifier
              inside LoginForm takes its place instead (see requirement #6).
              lg+ only (not md) so the one-line title always has enough width
              to render with whitespace-nowrap instead of wrapping.
              Solid light brand-tinted background (--color-bg-tint from the
              Estimation Hub marketing site's design tokens), not a solid
              dark navy block — the marketing site's own "predominantly
              white" rule reserves solid navy fills for a single homepage
              CTA band, not a default surface.
            */}
            <div className="hidden lg:flex lg:w-[44%] flex-col px-14 xl:px-16 py-16 bg-[#F7F9FB] border-r border-[#DFE6EE] overflow-hidden">
                {/* Logo — pinned to the top of the panel. The source PNG has
                    ~39px of transparent padding before the visible hexagon
                    starts (of 566px total width), so at this display width
                    a matching negative left margin pulls the icon's actual
                    left edge flush with the heading's "M", instead of the
                    image's invisible canvas edge. */}
                <Image
                    src="/brand/estimation-hub-logo-transparent.png"
                    alt="Estimation Hub"
                    width={566}
                    height={146}
                    priority
                    className="w-[320px] h-auto object-contain -ml-[32px]"
                />

                <div className="flex-1 flex flex-col justify-center pb-16">
                    <h1
                        className="text-[32px] font-bold leading-tight tracking-tight whitespace-nowrap"
                        style={{
                            backgroundImage:
                                'linear-gradient(100deg, #0e2b5c 0%, #00458b 38%, #045cb4 68%, #3ed1c7 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            color: '#0e2b5c',
                        }}
                    >
                        Market Intelligence Platform
                    </h1>
                    <div className="mt-3 w-12 h-[3px] bg-[#00458B]" aria-hidden="true" />
                    <p className="mt-4 text-lg leading-normal text-[#5B6B7D] max-w-md">
                        Live permit activity and contractor data.
                    </p>
                </div>
            </div>

            {/* Login area — pure white, form vertically centered, no card container */}
            <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
                <LoginForm />
            </div>
        </main>
    );
}
