import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { v4 as uuid } from 'uuid';
import { useApp } from '../../../context/AppContext';
import { CONDITION_BY_ID } from '../../../data/conditions';
import './InitiativeTracker.css';

function rollInitiative() {
  return Math.floor(Math.random() * 20) + 1;
}

export default function InitiativeTracker({ instanceId }) {
  const {
    players,
    enemies,
    addEnemyToCombat,
    npcs,
    addNPCToCombat,
    getCombat,
    updateCombatants,
    nextTurn,
    setCombatTurnIndex,
    t,
  } = useApp();
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedEnemyId, setSelectedEnemyId] = useState('');
  const [selectedNpcId, setSelectedNpcId] = useState('');

  const { combatants, currentTurnIndex } = getCombat(instanceId);

  const updateThisCombat = (updater) => updateCombatants(instanceId, updater);

  const addPlayerToCombat = () => {
    const player = players.find((p) => p.id === selectedPlayerId);
    if (!player) return;
    updateThisCombat((prev) => [
      ...prev,
      {
        id: uuid(),
        name: player.name,
        color: player.color,
        level: player.level,
        type: 'player',
        playerId: player.id,
        initiative: rollInitiative(),
        conditions: [],
        hp: { current: player.hp?.max ?? 10, max: player.hp?.max ?? 10 },
        ac: player.ac,
      },
    ]);
    setSelectedPlayerId('');
  };

  const addEnemyToCombatHandler = () => {
    const enemy = enemies.find((e) => e.id === selectedEnemyId);
    if (!enemy) return;
    addEnemyToCombat(instanceId, enemy);
    setSelectedEnemyId('');
  };

  const addNPCToCombatHandler = () => {
    const npc = npcs.find((n) => n.id === selectedNpcId);
    if (!npc) return;
    addNPCToCombat(instanceId, npc);
    setSelectedNpcId('');
  };

  const removeCombatant = (id) => {
    updateThisCombat((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCombatant = (id, changes) => {
    updateThisCombat((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  };

  const randomizeInitiative = () => {
    updateThisCombat((prev) => {
      const rolled = prev.map((c) => ({ ...c, initiative: rollInitiative() }));
      rolled.sort((a, b) => b.initiative - a.initiative);
      return rolled;
    });
    setCombatTurnIndex(instanceId, 0);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(combatants);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    updateThisCombat(() => reordered);
  };

  const availablePlayers = players.filter((p) => !combatants.some((c) => c.playerId === p.id));
  const availableEnemies = enemies.filter((e) => !combatants.some((c) => c.sourceEnemyId === e.id));
  const availableNpcs = npcs.filter(
    (n) => n.isCombat && !combatants.some((c) => c.sourceNpcId === n.id)
  );

  return (
    <div className="initiative-tracker">
      <div className="initiative-tracker__toolbar">
        <select value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)}>
          <option value="">{t('initiative.addPlayerPlaceholder')}</option>
          {availablePlayers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={addPlayerToCombat} disabled={!selectedPlayerId}>
          {t('initiative.addPlayerButton')}
        </button>
        <select value={selectedEnemyId} onChange={(e) => setSelectedEnemyId(e.target.value)}>
          <option value="">{t('initiative.addEnemyPlaceholder')}</option>
          {availableEnemies.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={addEnemyToCombatHandler} disabled={!selectedEnemyId}>
          {t('initiative.addEnemyButton')}
        </button>
        <select value={selectedNpcId} onChange={(e) => setSelectedNpcId(e.target.value)}>
          <option value="">{t('initiative.addNpcPlaceholder')}</option>
          {availableNpcs.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={addNPCToCombatHandler} disabled={!selectedNpcId}>
          {t('initiative.addNpcButton')}
        </button>
        <button type="button" onClick={randomizeInitiative} disabled={combatants.length === 0}>
          {t('initiative.randomizeButton')}
        </button>
        <button type="button" onClick={() => nextTurn(instanceId)} disabled={combatants.length === 0}>
          {t('initiative.nextTurnButton')}
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="initiative-list">
          {(provided) => (
            <ul className="initiative-tracker__list" ref={provided.innerRef} {...provided.droppableProps}>
              {combatants.length === 0 && (
                <li className="initiative-tracker__empty">{t('initiative.emptyList')}</li>
              )}
              {combatants.map((combatant, index) => (
                <Draggable key={combatant.id} draggableId={combatant.id} index={index}>
                  {(dragProvided, snapshot) => (
                    <li
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={`initiative-tracker__card ${index === currentTurnIndex ? 'is-current' : ''} ${
                        snapshot.isDragging ? 'is-dragging' : ''
                      }`}
                      style={{ borderLeftColor: combatant.color, ...dragProvided.draggableProps.style }}
                    >
                      <input
                        type="number"
                        className="initiative-tracker__initiative"
                        value={combatant.initiative}
                        onChange={(e) => updateCombatant(combatant.id, { initiative: Number(e.target.value) || 0 })}
                      />
                      <input
                        type="text"
                        className="initiative-tracker__name"
                        value={combatant.name}
                        onChange={(e) => updateCombatant(combatant.id, { name: e.target.value })}
                      />
                      {combatant.type === 'player' && combatant.level != null && (
                        <span className="initiative-tracker__level">
                          {t('initiative.levelPrefix')}
                          {combatant.level}
                        </span>
                      )}
                      {combatant.hp && (
                        <span
                          className={`initiative-tracker__hp ${
                            combatant.hp.current <= 0 ? 'initiative-tracker__hp--down' : ''
                          }`}
                          title={t('initiative.hpTitleHint')}
                        >
                          ❤ {combatant.hp.current}/{combatant.hp.max}
                        </span>
                      )}
                      {combatant.ac != null && (
                        <span className="initiative-tracker__ac" title={combatant.notes || t('initiative.acTitleHint')}>
                          🛡 {combatant.ac}
                        </span>
                      )}
                      {(combatant.type === 'player' || combatant.type === 'npc') &&
                        combatant.hp &&
                        combatant.hp.current <= 0 && (
                          <span
                            className={`initiative-tracker__death-save ${combatant.isDead ? 'is-dead' : ''}`}
                            title={t('initiative.deathSaveTitleHint')}
                          >
                            {combatant.isDead
                              ? '☠'
                              : `🎲 ${combatant.deathSaves?.successes || 0}/${combatant.deathSaves?.failures || 0}`}
                          </span>
                        )}
                      {combatant.conditions?.length > 0 && (
                        <span className="initiative-tracker__conditions" title={t('initiative.conditionsTitleHint')}>
                          {combatant.conditions.map((cond) => (
                            <span key={cond.id} className="initiative-tracker__condition-badge">
                              {CONDITION_BY_ID[cond.type]?.emoji ?? '❓'}
                              {cond.remainingRounds}
                            </span>
                          ))}
                        </span>
                      )}
                      <button
                        type="button"
                        className="initiative-tracker__remove"
                        onClick={() => removeCombatant(combatant.id)}
                        aria-label={t('initiative.removeAria', { name: combatant.name })}
                      >
                        ×
                      </button>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
