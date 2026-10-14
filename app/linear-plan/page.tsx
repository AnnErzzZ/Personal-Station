import type { Metadata } from "next";
import Image from "next/image";
import localFont from "next/font/local";
import { siteAsset } from "@/lib/site-asset";
import HeroVideo from "./HeroVideo";
import styles from "./page.module.css";

const inter = localFont({
  src: "../../public/linear-plan/inter-variable.woff2",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: { absolute: "Linear – Plan and navigate from idea to launch" },
  description: "Planning and monitoring. Plan and navigate from idea to launch.",
  robots: { index: false, follow: false },
};

const productLinks = [
  ["Intake", "/intake"],
  ["Planning and monitoring", "/plan"],
  ["AI and automations", "/ai"],
  ["Build, review and ship", "/build"],
];
const resourceLinks = [
  ["Documentation", "/docs"],
  ["Changelog", "/changelog"],
  ["Method", "/method"],
  ["Download", "/download"],
];

function Logo() {
  return (
    <a className={styles.logo} href="https://linear.app" aria-label="Linear home">
      <Image src={siteAsset("/linear-plan/linear-logo.svg")} alt="Linear" width={88} height={22} unoptimized />
    </a>
  );
}

function NavDropdown({ label, links }: { label: string; links: string[][] }) {
  return (
    <details className={styles.dropdown}>
      <summary className={styles.navLink}>{label}</summary>
      <div className={styles.dropdownPanel}>
        {links.map(([text, path]) => <a key={path} href={`https://linear.app${path}`}>{text}</a>)}
      </div>
    </details>
  );
}

export default function LinearPlanPage() {
  return (
    <div className={`${styles.page} ${inter.className}`} lang="en">
      <a className={styles.skipLink} href="#linear-content">Skip to content →</a>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Main navigation">
          <Logo />
          <div className={styles.desktopLinks}>
            <NavDropdown label="Product" links={productLinks} />
            <NavDropdown label="Resources" links={resourceLinks} />
            <a className={styles.navLink} href="https://linear.app/customers">Customers</a>
            <a className={styles.navLink} href="https://linear.app/pricing">Pricing</a>
            <a className={styles.navLink} href="https://linear.app/now">Now</a>
            <a className={styles.navLink} href="https://linear.app/contact">Contact</a>
            <span className={styles.divider} aria-hidden="true" />
          </div>
          <a className={`${styles.navLink} ${styles.login}`} href="https://linear.app/login">Log in</a>
          <a className={styles.signup} href="https://linear.app/signup">Sign up</a>
          <details className={styles.mobileMenu}>
            <summary aria-label="Toggle navigation"><span /><span /></summary>
            <div className={styles.mobilePanel}>
              {[...productLinks, ...resourceLinks, ["Customers", "/customers"], ["Pricing", "/pricing"], ["Now", "/now"], ["Contact", "/contact"]].map(([text, path]) => (
                <a key={path} href={`https://linear.app${path}`}>{text}</a>
              ))}
            </div>
          </details>
        </nav>
      </header>

      <main id="linear-content" className={styles.main}>
        <section className={styles.hero} aria-labelledby="linear-title">
          <div className={styles.background} aria-hidden="true">
            <HeroVideo />
            <div className={styles.topMask} />
            <div className={styles.bottomMask} />
          </div>
          <div className={styles.container}>
            <div className={styles.heroInset}>
              <div className={styles.heroTitle}>
                <p className={styles.eyebrow}>Planning and monitoring</p>
                <h1 id="linear-title">Plan and navigate <br className={styles.desktopBreak} />from idea to launch</h1>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.projects} ${styles.container}`} aria-labelledby="projects-title">
          <div className={styles.projectHeader}>
            <div className={styles.projectTitle}>
              <p className={styles.mobileEyebrow}>Projects</p>
              <h2 id="projects-title">Manage projects<br />end-to-end</h2>
            </div>
            <div className={styles.description}>
              <p>Coordinate larger pieces of work across multiple people and teams. Move seamlessly between ideation and execution.</p>
              <a className={styles.projectLink} href="https://linear.app/features/projects">Projects <span aria-hidden="true">+</span></a>
            </div>
          </div>
          <a className={styles.projectPreview} href="https://linear.app/features/projects" aria-label="Explore Linear Projects">
            <div className={styles.projectWindow}>
              <div className={styles.windowNav}><span>Overview</span><span>Activity</span><span>Customers</span><span>Issues</span><span className={styles.windowMenu}>···</span></div>
              <div className={styles.windowContent}>
                <span className={styles.projectIcon}>◈</span>
                <h3>Website redesign</h3>
                <p>A new foundation for everything we’re building next.</p>
                <div className={styles.properties}><span>Properties</span><span className={styles.status}>◕ In Progress</span><span>◎ Product</span><span>◷ Jun 30</span></div>
                <div className={styles.document}><span>▧ Project brief</span><span>▧ Design explorations</span><span>+ Add document</span></div>
                <h4>Project overview</h4>
                <p>Bring our vision to life with a thoughtful, cohesive experience from the first interaction to the last.</p>
                <div className={styles.milestone}><span>◇ Milestones</span><span>Design exploration <b>Completed</b></span><span>Build and polish <b>In progress</b></span><span>Public launch <b>Jun 30</b></span></div>
              </div>
            </div>
          </a>
        </section>
      </main>
    </div>
  );
}
