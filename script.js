document.addEventListener('DOMContentLoaded', () => {
  const treeContainer = document.getElementById('tree');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const pathText = document.getElementById('pathText');
  const searchHint = document.getElementById('searchHint');

  // S18 阵容池与入口关系分开维护，便于后续增加更多判断层级。
  const comps = {
    1: { id: 1, name: '神谕莲华阿狸' },
    2: { id: 2, name: '黑荆棘月男' },
    3: { id: 3, name: '野怪九五' },
    4: { id: 4, name: '裁决婕拉' },
    5: { id: 5, name: '绝命花妖凯南' },
    6: { id: 6, name: '花仙转蜘蛛' },
    7: { id: 7, name: '莲华婕拉希维尔' },
    8: { id: 8, name: '重装厄斐琉斯' },
    9: { id: 9, name: '11羁绊野兽希维尔' }
  };

  const triggers = [
    { id: 'ap', label: 'AP装备', type: 'gear', compIds: [1, 7] },
    { id: 'ad', label: 'AD装备', type: 'gear', compIds: [2, 3, 8] },
    { id: 'executioner', label: '裁决转职', type: 'hx', compIds: [4] },
    { id: 'deadly-flower', label: '绝命花妖转职', type: 'hx', compIds: [5] },
    { id: 'faerie', label: '花仙转职', type: 'hx', compIds: [6] },
    { id: 'swift-striker', label: '迅疾射手转职', type: 'hx', compIds: [2] },
    { id: 'lunar-eclipse', label: '月蚀转职', type: 'hx', compIds: [2] },
    { id: 'bronze-for-life', label: '终身黄铜', type: 'hx', compIds: [9] }
  ];

  const decisionTree = [{
    id: 'root',
    type: 'hx',
    label: 'S18 V1 第一层决策',
    children: triggers.map((trigger) => ({
      id: `trigger-${trigger.id}`,
      type: trigger.type,
      label: trigger.label,
      children: trigger.compIds.map((compId) => ({
        id: `trigger-${trigger.id}-comp-${compId}`,
        compId,
        type: 'comp',
        label: `${comps[compId].id} ${comps[compId].name}`
      }))
    }))
  }];

  const state = { expanded: new Set(['root']), activeId: null };
  const nodeMap = new Map();

  function collectNodes(nodes) {
    nodes.forEach((node) => {
      nodeMap.set(node.id, node);
      if (node.children) collectNodes(node.children);
    });
  }

  collectNodes(decisionTree);

  function findPath(targetId) {
    function walk(nodes, path = []) {
      for (const node of nodes) {
        const nextPath = [...path, node.id];
        if (node.id === targetId) return nextPath;
        if (node.children) {
          const result = walk(node.children, nextPath);
          if (result.length) return result;
        }
      }
      return [];
    }

    return walk(decisionTree);
  }

  function expandAncestors(pathIds) {
    pathIds.slice(0, -1).forEach((id) => state.expanded.add(id));
  }

  function updateDetail(pathIds) {
    if (!pathIds.length) {
      pathText.textContent = '请选择一个入口或阵容节点查看路径。';
      return;
    }

    const labels = pathIds.map((id) => nodeMap.get(id)?.label).filter(Boolean);
    pathText.textContent = labels.join(' → ');
  }

  function renderTree() {
    treeContainer.replaceChildren();

    function renderNodes(nodes) {
      const fragment = document.createDocumentFragment();

      nodes.forEach((node) => {
        const item = document.createElement('div');
        const button = document.createElement('button');
        const hasChildren = Boolean(node.children?.length);
        button.type = 'button';
        button.className = `node node--${node.type}`;
        button.dataset.nodeId = node.id;

        if (state.activeId === node.id) button.classList.add('active');

        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = node.label;
        button.appendChild(label);

        const meta = document.createElement('span');
        meta.className = 'meta';
        meta.textContent = hasChildren
          ? (state.expanded.has(node.id) ? '点击收起' : '点击展开')
          : '点击查看路径';
        button.appendChild(meta);

        button.addEventListener('click', () => {
          state.activeId = node.id;

          // 只切换当前节点，保留所有其他节点的展开状态。
          if (hasChildren) {
            if (state.expanded.has(node.id)) state.expanded.delete(node.id);
            else state.expanded.add(node.id);
          }

          const pathIds = findPath(node.id);
          expandAncestors(pathIds);
          updateDetail(pathIds);
          renderTree();
        });

        item.appendChild(button);

        if (hasChildren && state.expanded.has(node.id)) {
          const childrenWrapper = document.createElement('div');
          childrenWrapper.className = 'tree-children';
          childrenWrapper.appendChild(renderNodes(node.children));
          item.appendChild(childrenWrapper);
        }

        fragment.appendChild(item);
      });

      return fragment;
    }

    treeContainer.appendChild(renderNodes(decisionTree));
  }

  function searchByName() {
    const query = searchInput.value.trim().toLocaleLowerCase('zh-CN');
    if (!query) {
      searchHint.textContent = '请输入阵容编号或名称后定位。';
      return;
    }

    const matchedComp = Object.values(comps).find((comp) =>
      comp.name.toLocaleLowerCase('zh-CN').includes(query)
      || String(comp.id) === query
      || `${comp.id} ${comp.name}`.toLocaleLowerCase('zh-CN').includes(query)
    );

    if (!matchedComp) {
      searchHint.textContent = '未找到匹配的 S18 阵容，请更换关键词。';
      return;
    }

    const matchedNode = Array.from(nodeMap.values()).find(
      (node) => node.type === 'comp' && node.compId === matchedComp.id
    );
    const pathIds = findPath(matchedNode.id);
    state.activeId = matchedNode.id;
    expandAncestors(pathIds);
    updateDetail(pathIds);
    renderTree();
    document.querySelector(`[data-node-id="${matchedNode.id}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
    searchHint.textContent = `已定位：${matchedComp.id} ${matchedComp.name}`;
  }

  searchBtn.addEventListener('click', searchByName);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') searchByName();
  });

  updateDetail([]);
  renderTree();
});
