import { useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { usePersistedState } from "../../../hooks/usePersistedState";
import { resolveCombatantAvatar } from "../../../services/combatants";
import "./HPTracker.css";

const DEFAULT_HP = { current: 10, max: 10, temp: 0 };
const TEMP_COLOR = "#518EDE";

export default function HPTracker({ instanceId }) {
  const {
    dashboardLayout,
    getCombat,
    updateCombatants,
    players,
    enemies,
    npcs,
    syncOptions,
    t,
  } = useApp();
  const [config, setConfig] = usePersistedState(
    `hpTracker:${instanceId}`,
    { linkedInstanceId: null },
    syncOptions,
  );
  // Cantidad a sumar/restar por combatiente y tipo (hp o temp) con los
  // botones +/-. Es un valor de trabajo efímero, no necesita persistirse.
  const [amounts, setAmounts] = useState({});
  const getAmount = (combatantId, field) => amounts[combatantId]?.[field] ?? 1;
  const setAmount = (combatantId, field, value) => {
    setAmounts((prev) => ({
      ...prev,
      [combatantId]: { ...prev[combatantId], [field]: Math.max(0, Number(value) || 0) },
    }));
  };

  const initiativeInstances = dashboardLayout.filter(
    (item) => (item.type || item.i) === "initiative",
  );
  const initiativeIds = initiativeInstances.map((it) => it.i).join(",");

  useEffect(() => {
    if (initiativeInstances.length === 0) return;
    const stillExists = initiativeInstances.some(
      (it) => it.i === config.linkedInstanceId,
    );
    if (!config.linkedInstanceId || !stillExists) {
      setConfig((prev) => ({
        ...prev,
        linkedInstanceId: initiativeInstances[0].i,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initiativeIds, config.linkedInstanceId]);

  if (initiativeInstances.length === 0) {
    return (
      <div className="hp-tracker">
        <p className="hp-tracker__empty">{t("hpTracker.emptyNoInitiative")}</p>
      </div>
    );
  }

  const linkedId = config.linkedInstanceId;
  const { combatants } = linkedId ? getCombat(linkedId) : { combatants: [] };

  const applyDelta = (combatantId, delta) => {
    updateCombatants(linkedId, (prev) =>
      prev.map((c) => {
        if (c.id !== combatantId) return c;
        const hp = c.hp || DEFAULT_HP;
        const current = Math.max(0, Math.min(hp.current + delta, hp.max));
        return { ...c, hp: { ...hp, current } };
      }),
    );
  };

  const applyTempDelta = (combatantId, delta) => {
    updateCombatants(linkedId, (prev) =>
      prev.map((c) => {
        if (c.id !== combatantId) return c;
        const hp = c.hp || DEFAULT_HP;
        const temp = Math.max(0, (hp.temp || 0) + delta);
        return { ...c, hp: { ...hp, temp } };
      }),
    );
  };

  const setCurrent = (combatantId, value) => {
    updateCombatants(linkedId, (prev) =>
      prev.map((c) => {
        if (c.id !== combatantId) return c;
        const hp = c.hp || DEFAULT_HP;
        const current = Math.max(0, Math.min(Number(value) || 0, hp.max));
        return { ...c, hp: { ...hp, current } };
      }),
    );
  };

  const setMax = (combatantId, value) => {
    updateCombatants(linkedId, (prev) =>
      prev.map((c) => {
        if (c.id !== combatantId) return c;
        const hp = c.hp || DEFAULT_HP;
        const max = Math.max(1, Number(value) || 1);
        return { ...c, hp: { ...hp, current: Math.min(hp.current, max), max } };
      }),
    );
  };

  const removeCombatant = (combatantId) => {
    updateCombatants(linkedId, (prev) =>
      prev.filter((c) => c.id !== combatantId),
    );
  };



  return (
    <div className="hp-tracker">
      {initiativeInstances.length > 1 && (
        <div className="hp-tracker__linker">
          <label>
            {t("hpTracker.linkedLabel")}
            <select
              value={linkedId ?? ""}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  linkedInstanceId: e.target.value,
                }))
              }
            >
              {initiativeInstances.map((it, idx) => (
                <option key={it.i} value={it.i}>
                  {t("conditionTracker.trackerOption", { n: idx + 1 })}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <ul className="hp-tracker__list">
        {combatants.length === 0 && (
          <li className="hp-tracker__empty">
            {t("hpTracker.emptyNoCombatants")}
          </li>
        )}
        {combatants.map((combatant) => {
          const hp = combatant.hp || DEFAULT_HP;
          const temp = hp.temp || 0;
          const totalMax = hp.max + temp;
          const hpPct = totalMax > 0 ? (Math.min(hp.current, hp.max) / totalMax) * 100 : 0;
          const tempPct = totalMax > 0 ? (temp / totalMax) * 100 : 0;
          const isDown = hp.current <= 0;
          const hpAmount = getAmount(combatant.id, "hp");
          const tempAmount = getAmount(combatant.id, "temp");
          const avatar = resolveCombatantAvatar(combatant, {
            players,
            enemies,
            npcs,
          });
          return (
            <li key={combatant.id} className="hp-tracker__row">
              <div className="hp-tracker__row-header">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={combatant.name}
                    className="hp-tracker__combatant-image"
                  />
                ) : (
                  <div
                    className="hp-tracker__combatant-image-placeholder"
                    style={{ background: combatant.color }}
                  >
                    {combatant.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hp-tracker__slider-container">
                  <div className="hp-tracker__name-value-container">
                    <span className="hp-tracker__name">{combatant.name}</span>
                    <span
                      className="hp-tracker__value"
                      style={{ "--personal-color": TEMP_COLOR }}
                    >
                      {t("hpTracker.tempLabel")} {temp}
                    </span>
                    <span
                      className={`hp-tracker__value ${isDown ? "is-down" : ""}`}
                      style={{ "--personal-color": combatant.color }}
                    >
                      {t("hpTracker.hpLabel")} {hp.current} / {hp.max}
                    </span>
                  </div>
                  <div className="hp-tracker__bar-wrap">
                    <input
                      type="range"
                      className={`hp-tracker__slider ${isDown ? "is-down" : ""}`}
                      min="0"
                      max={hp.max}
                      value={hp.current}
                      onChange={(e) => setCurrent(combatant.id, e.target.value)}
                      style={{ "--hp-pct": `${hpPct}%`, "--personal-color": combatant.color }}
                      aria-label={t("hpTracker.hpSliderAria", {
                        name: combatant.name,
                      })}
                    />
                    {temp > 0 && (
                      <div
                        className="hp-tracker__temp-fill"
                        style={{ left: `${hpPct}%`, width: `${tempPct}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="hp-tracker__controls">
                <div className="hp-tracker__stepper">
                  <span className="hp-tracker__stepper-label">{t("hpTracker.hpLabel")}</span>
                  <div className="hp-tracker__stepper-row">
                    <button
                      type="button"
                      onClick={() => applyDelta(combatant.id, hpAmount)}
                      aria-label={t("hpTracker.increaseAria", { label: t("hpTracker.hpLabel"), name: combatant.name })}
                    >
                      +
                    </button>
                    <input
                      type="number"
                      min="0"
                      className="hp-tracker__amount-input"
                      value={hpAmount}
                      onChange={(e) => setAmount(combatant.id, "hp", e.target.value)}
                      aria-label={t("hpTracker.amountAria", { label: t("hpTracker.hpLabel"), name: combatant.name })}
                    />
                    <button
                      type="button"
                      onClick={() => applyDelta(combatant.id, -hpAmount)}
                      aria-label={t("hpTracker.decreaseAria", { label: t("hpTracker.hpLabel"), name: combatant.name })}
                    >
                      −
                    </button>
                  </div>
                </div>

                <div className="hp-tracker__stepper hp-tracker__stepper--temp">
                  <span className="hp-tracker__stepper-label">{t("hpTracker.tempLabel")}</span>
                  <div className="hp-tracker__stepper-row">
                    <button
                      type="button"
                      onClick={() => applyTempDelta(combatant.id, tempAmount)}
                      aria-label={t("hpTracker.increaseAria", { label: t("hpTracker.tempLabel"), name: combatant.name })}
                    >
                      +
                    </button>
                    <input
                      type="number"
                      min="0"
                      className="hp-tracker__amount-input"
                      value={tempAmount}
                      onChange={(e) => setAmount(combatant.id, "temp", e.target.value)}
                      aria-label={t("hpTracker.amountAria", { label: t("hpTracker.tempLabel"), name: combatant.name })}
                    />
                    <button
                      type="button"
                      onClick={() => applyTempDelta(combatant.id, -tempAmount)}
                      aria-label={t("hpTracker.decreaseAria", { label: t("hpTracker.tempLabel"), name: combatant.name })}
                    >
                      −
                    </button>
                  </div>
                </div>

                <label className="hp-tracker__max-label">
                  {t("hpTracker.maxLabel")}
                  <input
                    type="number"
                    min="1"
                    className="hp-tracker__max-input"
                    value={hp.max}
                    onChange={(e) => setMax(combatant.id, e.target.value)}
                  />
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
