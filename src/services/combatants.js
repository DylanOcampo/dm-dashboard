// Los combatientes guardan un `image` "snapshot" del avatar al momento de
// agregarlos al combate (ver addPlayerToCombat/addEnemyToCombat/
// addNPCToCombat), pero eso significa que un combatiente agregado antes de
// que el jugador/enemigo/NPC tuviera avatar se queda sin imagen para
// siempre. Por eso HPTracker y SaveThrowTracker resuelven el avatar en vivo
// contra el roster actual (players/enemies/npcs) y solo caen al snapshot
// como respaldo si la fuente ya no existe (fue borrada del roster).
export function resolveCombatantAvatar(combatant, { players, enemies, npcs }) {
  if (!combatant) return null;
  if (combatant.type === 'player') {
    return players.find((p) => p.id === combatant.playerId)?.avatar || combatant.image || null;
  }
  if (combatant.type === 'enemy') {
    return enemies.find((e) => e.id === combatant.sourceEnemyId)?.avatar || combatant.image || null;
  }
  if (combatant.type === 'npc') {
    return npcs.find((n) => n.id === combatant.sourceNpcId)?.avatar || combatant.image || null;
  }
  return combatant.image || null;
}
