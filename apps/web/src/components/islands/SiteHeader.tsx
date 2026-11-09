import { Menu01Icon, Moon02Icon, Search01Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button, Drawer, Separator, Tooltip, type PressEvent } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";

import { getResolvedTheme, setThemePreference, themeOrigin } from "../../lib/theme";
import BrandLogo, { BrandWordmark } from "./BrandLogo";
import SearchForm from "./SearchForm";
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
		"font-medium",
		current ? "bg-default text-foreground" : "text-muted hover:text-foreground",
	);
}

export default function SiteHeader({
	siteTitle,
	logo,
	items,
	isLoggedIn = false,
	searchQuery = "",
	themePreference,
}: Props) {
	const toggleTheme = (press: PressEvent) =>
		setThemePreference(getResolvedTheme() === "dark" ? "light" : "dark", themeOrigin(press));

	// backdrop-blur-md, not xl: the blur is redrawn under every scrolled frame and its
	// cost grows with the radius; at 80% opacity the larger radius doesn't show.
	return (
		<header className="sticky top-0 z-50 border-b border-separator/70 bg-background/80 backdrop-blur-md backdrop-saturate-150">
			<div className="container-page flex h-16 items-center gap-3">
				<Brand siteTitle={siteTitle} logo={logo} />

				{items.length > 0 && (
					<nav aria-label="Navigasi utama" className="ms-4 hidden md:block">
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

				<div className="ms-auto flex items-center gap-1.5">
					<SearchForm
						className="hidden w-64 lg:block"
						defaultValue={searchQuery}
						shortcut
					/>

					<Tooltip delay={300}>
						<Button
							isIconOnly
							variant="ghost"
							aria-label="Cari"
							className="lg:hidden"
							onPress={() => window.location.assign("/search")}
						>
							<HugeiconsIcon icon={Search01Icon} />
						</Button>
						<Tooltip.Content>Cari</Tooltip.Content>
					</Tooltip>

					<Tooltip delay={300}>
						<Button isIconOnly variant="ghost" aria-label="Ganti tema" onPress={toggleTheme}>
							<HugeiconsIcon icon={Sun03Icon} className="dark:hidden" />
							<HugeiconsIcon icon={Moon02Icon} className="hidden dark:block" />
						</Button>
						<Tooltip.Content>Ganti tema terang/gelap</Tooltip.Content>
					</Tooltip>

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
																	"pressable flex h-11 items-center rounded-xl px-3 text-[0.9375rem] font-medium [--press-scale:0.98]",
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
											<span className="text-sm text-muted">Tema</span>
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
