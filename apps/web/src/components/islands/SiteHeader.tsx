import { ArrowDown01Icon, ArrowRight01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button, Drawer, Popover, Separator } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import { useState, useSyncExternalStore } from "react";

import { getEmptyOutline, getOutline, subscribeOutline } from "../../lib/article-outline";
import BrandLogo, { BrandWordmark } from "./BrandLogo";
import SearchForm from "./SearchForm";
import SearchPalette from "./SearchPalette";
import ThemeSwitcher from "./ThemeSwitcher";
import type { ThemePreference } from "../../lib/theme";

export interface NavItem {
	label: string;
	url: string;
	target?: string;
	/** "page" for the current page, "true" for its parent section */
	current?: "page" | "true";
}

interface Props {
	siteTitle: string;
	logo?: { url: string; alt?: string } | null;
	items: NavItem[];
	isLoggedIn?: boolean;
	searchQuery?: string;
	themePreference: ThemePreference;
	/** On an article: the title that replaces the navigation once the page's H1 has scrolled away. */
	articleTitle?: string;
}

function Brand({ siteTitle, logo }: Pick<Props, "siteTitle" | "logo">) {
	return (
		<a
			href="/"
			className="pressable flex min-w-0 items-center rounded-xl text-foreground"
		>
			{logo ? (
				<img src={logo.url} alt={logo.alt || siteTitle} className="h-8 w-auto" />
			) : (
				<>
					<BrandLogo title={siteTitle} className="h-8 w-auto shrink-0" />
					{/* Two layers so the wordmark, its gap and all, can collapse to zero width. */}
					<span className="header-brand-name">
						<span className="min-w-0 overflow-hidden">
							<BrandWordmark className="block h-8 w-auto max-w-none" />
						</span>
					</span>
				</>
			)}
		</a>
	);
}

function navLinkClass(current?: NavItem["current"]) {
	return cn(
		buttonVariants({ variant: "ghost", size: "sm" }),
		"typography--weight-medium",
		current ? "bg-default text-foreground" : "text-muted hover:text-foreground",
	);
}

/**
 * The article's title and current section, docked in the header while reading.
 * With headings to jump to, it opens the table of contents.
 */
function DockedTitle({ title }: { title: string }) {
	const { sections, activeId } = useSyncExternalStore(subscribeOutline, getOutline, getEmptyOutline);
	const [isOpen, setOpen] = useState(false);
	const active = sections.find((section) => section.id === activeId);

	const label = (
		<span className="flex min-w-0 items-center gap-1.5 typography--h6">
			{/* On phones the section alone fits; the title returns between sections. */}
			<span className={cn("min-w-0 shrink-[3] truncate typography--weight-semibold text-foreground", active && "max-sm:hidden")}>
				{title}
			</span>
			{active && (
				<>
					<HugeiconsIcon
						icon={ArrowRight01Icon}
						size={14}
						className="shrink-0 text-muted max-sm:hidden"
						aria-hidden="true"
					/>
					<span key={active.id} className="header-section min-w-0 truncate typography--weight-medium text-muted max-sm:font-semibold max-sm:text-foreground">
						{active.title}
					</span>
				</>
			)}
		</span>
	);

	if (sections.length === 0) {
		// A decorative repeat of the page's H1, so screen readers skip it.
		return (
			<span className="header-title" aria-hidden="true">
				{label}
			</span>
		);
	}

	return (
		<span className="header-title">
			<Popover isOpen={isOpen} onOpenChange={setOpen}>
				<Popover.Trigger className="-ms-2 max-w-[calc(100%+0.5rem)] min-w-0">
					<Button
						variant="ghost"
						size="sm"
						aria-label="Buka daftar isi"
						className="h-9 max-w-full min-w-0 gap-1 px-2"
					>
						{label}
						<HugeiconsIcon icon={ArrowDown01Icon} size={14} className="shrink-0 text-muted" aria-hidden="true" />
					</Button>
				</Popover.Trigger>
				<Popover.Content placement="bottom start" className="w-80 max-w-[calc(100vw-2rem)]">
					<Popover.Dialog className="flex flex-col gap-1 p-2">
						<Popover.Heading className="px-3 pt-1 pb-1 typography--body-sm typography--weight-semibold text-foreground">
							Di halaman ini
						</Popover.Heading>
						<ol className="flex max-h-[60dvh] flex-col gap-0.5 overflow-y-auto">
							{sections.map((section) => (
								<li key={section.id} className={section.nested ? "toc-item--nested" : undefined}>
									<a
										href={`#${section.id}`}
										aria-current={section.id === activeId ? "true" : undefined}
										className={cn("toc-link", section.id === activeId && "bg-surface-secondary text-foreground")}
										onClick={() => setOpen(false)}
									>
										{section.title}
									</a>
								</li>
							))}
						</ol>
					</Popover.Dialog>
				</Popover.Content>
			</Popover>
		</span>
	);
}

export default function SiteHeader({
	siteTitle,
	logo,
	items,
	isLoggedIn = false,
	searchQuery = "",
	themePreference,
	articleTitle,
}: Props) {
	return (
		<header className="sticky top-0 z-50">
			<div className="header-progressive-blur" aria-hidden="true">
				<span />
				<span />
				<span />
			</div>
			<div className="container-page flex h-16 items-center gap-3">
				<div className="header-swap flex h-full min-w-0 flex-1 items-center">
					<Brand siteTitle={siteTitle} logo={logo} />

					<div className="relative ms-4 flex h-full min-w-0 flex-1 items-center">
						{items.length > 0 && (
							<nav aria-label="Navigasi utama" className="header-nav hidden md:block">
								<ul className="flex items-center gap-1">
									{items.map((item) => (
										<li key={`${item.url}-${item.label}`}>
											<a
												href={item.url}
												target={item.target}
												rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
												aria-current={item.current}
												className={navLinkClass(item.current)}
											>
												{item.label}
											</a>
										</li>
									))}
								</ul>
							</nav>
						)}

						{articleTitle && <DockedTitle title={articleTitle} />}
					</div>
				</div>

				<div className="flex items-center gap-1.5">
					<SearchPalette />

					{isLoggedIn && (
						<a
							href="/_emdash/admin"
							className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden md:inline-flex")}
						>
							Admin
						</a>
					)}

					<Drawer>
						<Button isIconOnly variant="ghost" aria-label="Buka menu" className="md:hidden">
							<HugeiconsIcon icon={Menu01Icon} />
						</Button>
						<Drawer.Backdrop variant="blur">
							<Drawer.Content placement="right">
								<Drawer.Dialog aria-label="Menu">
									<Drawer.CloseTrigger />
									<Drawer.Header>
										<Drawer.Heading>{siteTitle}</Drawer.Heading>
									</Drawer.Header>
									<Drawer.Body className="flex flex-col gap-6">
										<SearchForm defaultValue={searchQuery} variant="secondary" />
										{items.length > 0 && (
											<nav aria-label="Navigasi utama">
												<ul className="flex flex-col gap-1">
													{items.map((item) => (
														<li key={`${item.url}-${item.label}`}>
															<a
																href={item.url}
																target={item.target}
																rel={
																	item.target === "_blank" ? "noopener noreferrer" : undefined
																}
																aria-current={item.current}
																className={cn(
																	"pressable flex h-11 items-center rounded-xl px-3 typography--body typography--weight-medium [--press-scale:0.98]",
																	item.current
																		? "bg-surface-secondary text-foreground"
																		: "text-muted hover:bg-default hover:text-foreground",
																)}
															>
																{item.label}
															</a>
														</li>
													))}
												</ul>
											</nav>
										)}
									</Drawer.Body>
									<Drawer.Footer className="flex flex-col items-stretch gap-4">
										<Separator />
										<div className="flex items-center justify-between gap-3">
											<span className="typography--body-sm text-muted">Tema</span>
											<ThemeSwitcher initialPreference={themePreference} />
										</div>
										{isLoggedIn && (
											<a
												href="/_emdash/admin"
												className={buttonVariants({ variant: "outline", fullWidth: true })}
											>
												Buka Admin
											</a>
										)}
									</Drawer.Footer>
								</Drawer.Dialog>
							</Drawer.Content>
						</Drawer.Backdrop>
					</Drawer>
				</div>
			</div>
		</header>
	);
}
