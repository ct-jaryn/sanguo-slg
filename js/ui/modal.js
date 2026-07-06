function closeModal() {
  document.getElementById('modal').style.display='none';
  document.getElementById('modal-content').innerHTML='';
}

function showBattleReport(r) {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;
  const resultColor = r.victory ? 'var(--accent-green)' : 'var(--accent-red)';
  const resultText = r.victory ? '胜利' : '失败';
  content.innerHTML = `
    <h2>战斗结算 · ${r.cityName}</h2>
    <div style="margin:8px 0"><b style="color:${resultColor}">${resultText}</b> · 战术：${r.tacticName}</div>
    <div style="margin:8px 0">攻方：${r.attacker} · ${r.armyName}（主将 ${r.mainGeneral}）</div>
    <div style="margin:8px 0">守方：${r.defender}</div>
    <div style="margin:8px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div style="padding:8px;border:1px solid var(--border);border-radius:4px">攻方损失<br/><b>${r.atkLosses}</b></div>
      <div style="padding:8px;border:1px solid var(--border);border-radius:4px">守方损失<br/><b>${r.defLosses}</b></div>
    </div>
    ${r.bonds && r.bonds.length ? `<div style="margin:8px 0"><b>羁绊触发：</b>${r.bonds.join('、')}</div>` : ''}
    ${r.reward ? `<div style="margin:8px 0">获得金钱：<b>${r.reward}</b></div>` : ''}
    ${r.equipment ? `<div style="margin:8px 0">缴获装备：<b>${r.equipment}</b></div>` : ''}
    <div style="margin-top:12px"><button class="action" onclick="window.closeModal()">关闭</button></div>`;
  modal.style.display = 'flex';
}

export { closeModal, showBattleReport };
