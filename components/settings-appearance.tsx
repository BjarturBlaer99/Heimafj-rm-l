"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { useAppTheme, type AppTheme } from "@/components/use-app-theme";
import styles from "./settings-appearance.module.css";

const options: { theme: AppTheme; label: string; icon: typeof SunIcon }[] = [
  { theme: "light", label: "Ljóst", icon: SunIcon },
  { theme: "dark", label: "Dökkt", icon: MoonIcon }
];

export function SettingsAppearance() {
  const { theme, setTheme } = useAppTheme();

  return (
    <fieldset className={styles.choices}>
      <legend className="sr-only">Veldu útlit síðunnar</legend>
      {options.map(({ theme: option, label, icon: Icon }) => {
        const selected = option === theme;
        return (
          <button
            key={option}
            type="button"
            className={`${styles.option} focus-ring`}
            aria-pressed={selected}
            onClick={() => setTheme(option)}
          >
            <span className={styles.preview} data-theme={option} aria-hidden="true">
              <span className={styles.sidebar}><span /><span /><span /><span /></span>
              <span className={styles.workspace}>
                <span className={styles.previewTitle} />
                <span className={styles.balance}><span /><span /></span>
                <span className={styles.rows}><span /><span /><span /></span>
              </span>
            </span>
            <span className={styles.caption}>
              <span className={styles.label}><Icon size={16} weight="duotone" aria-hidden="true" />{label}</span>
              <span className={styles.selected} aria-hidden="true">{selected ? <CheckIcon size={12} weight="bold" /> : null}</span>
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
