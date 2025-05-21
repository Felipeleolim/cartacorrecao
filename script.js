// =============================================
// CONFIGURAÇÕES E CONSTANTES
// =============================================
const FIXED_TAGS = {
  chave: "chNFe",
  dataEvento: "dhEvento",
  cnpj: "dest > CNPJ",
  nome: "dest > xNome",
  motivo: "infCpl",
  valorNota: "vNF",
  correcao: "xCorrecao",
  justificativa: "xJust"
};

const VENDEDORES = [
  "Sem Vendedor Selecionado",
  "Ariana Gallo",
  "André Godoy",
  "André Gama",
  "Anderson Mendes",
  "Jonas Rocha",
  "Paulo Henrique",
  "Israel Gomes",
  "Marcelo Ilhesca",
  "Cristiano Alves",
  "Renata Bernardes"
];

// =============================================
// ESTADO DA APLICAÇÃO
// =============================================
let customTags = [];
let appState = {
  processedFiles: 0,
  lastOperation: null,
  vendedoresSelecionados: {},
  currentTab: "carta",
  files: [],
  results: {
    carta: [],
    cancelamento: [],
    devolucao: []
  }
};

// =============================================
// ELEMENTOS DOM
// =============================================
const DOM = {
  customTagInput: document.getElementById("customTagInput"),
  addTagBtn: document.getElementById("addTagBtn"),
  customTagsContainer: document.getElementById("customTagsContainer"),
  processBtn: document.getElementById("processXmlBtn"),
  fileInput: document.getElementById("xmlFile"),
  spinner: document.getElementById("spinner"),
  statusBar: document.getElementById("statusBar"),
  alertContainer: document.getElementById("alertContainer"),
  dropZone: document.getElementById("dropZone"),
  tabs: {
    buttons: document.querySelectorAll(".tab-button"),
    contents: document.querySelectorAll(".tab")
  },
  tables: {
    carta: document.getElementById("tabelaCarta"),
    cancelamento: document.getElementById("tabelaCancelamento"),
    devolucao: document.getElementById("tabelaDevolucao")
  },
  emptyStates: {
    carta: document.getElementById("empty-carta"),
    cancelamento: document.getElementById("empty-cancelamento"),
    devolucao: document.getElementById("empty-devolucao")
  },
  exportButtons: document.querySelectorAll(".export-button"),
  searchInputs: document.querySelectorAll(".search-input"),
  filters: {
    carta: {
      start: document.getElementById("filter-start-carta"),
      end: document.getElementById("filter-end-carta"),
      button: document.getElementById("filter-carta"),
      reset: document.getElementById("reset-carta")
    },
    cancelamento: {
      start: document.getElementById("filter-start-cancelamento"),
      end: document.getElementById("filter-end-cancelamento"),
      button: document.getElementById("filter-cancelamento"),
      reset: document.getElementById("reset-cancelamento")
    },
    devolucao: {
      start: document.getElementById("filter-start-devolucao"),
      end: document.getElementById("filter-end-devolucao"),
      button: document.getElementById("filter-devolucao"),
      reset: document.getElementById("reset-devolucao")
    }
  }
};

// =============================================
// FUNÇÕES PRINCIPAIS
// =============================================

// Inicialização da aplicação
function init() {
  checkXLSXSupport();
  setupEventListeners();
  setupDateFilters();
  checkEmptyTables();
  updateStatus("Aguardando arquivos XML...");
  loadSettings();
  
  // Ativa a aba inicial com animação
  setTimeout(() => {
    document.getElementById(`aba-${appState.currentTab}`).classList.add("ativa");
    document.getElementById(`aba-${appState.currentTab}`).style.opacity = 1;
  }, 100);
}

// Configura todos os event listeners
function setupEventListeners() {
  // Navegação entre abas
  DOM.tabs.buttons.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  
  // Adicionar tag customizada
  DOM.addTagBtn.addEventListener("click", addCustomTag);
  DOM.customTagInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addCustomTag();
  });
  
  // Seleção de arquivos
  DOM.fileInput.addEventListener("change", handleFileSelection);
  
  // Drag and drop
  DOM.dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    DOM.dropZone.classList.add("active");
  });
  
  DOM.dropZone.addEventListener("dragleave", () => {
    DOM.dropZone.classList.remove("active");
  });
  
  DOM.dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    DOM.dropZone.classList.remove("active");
    handleDroppedFiles(e.dataTransfer.files);
  });
  
  // Processar arquivos
  DOM.processBtn.addEventListener("click", processFiles);
  
  // Exportar para Excel
  setupExportButtons();
  
  // Busca nas tabelas
  setupSearchInputs();
  
  // Vendedores (devolução)
  document.getElementById("salvarVendedores")?.addEventListener("click", salvarVendedores);
  document.getElementById("editarVendedores")?.addEventListener("click", editarVendedores);
}

// Configura os filtros de data
function setupDateFilters() {
  for (const [tabName, filter] of Object.entries(DOM.filters)) {
    filter.button.addEventListener("click", () => applyDateFilter(tabName));
    filter.reset.addEventListener("click", () => resetDateFilter(tabName));
  }
}

// Aplica filtro por data
function applyDateFilter(tabName) {
  const startDate = DOM.filters[tabName].start.value;
  const endDate = DOM.filters[tabName].end.value;
  
  if (!startDate && !endDate) {
    showAlert("Selecione pelo menos uma data para filtrar", "warning");
    return;
  }
  
  const table = DOM.tables[tabName];
  const rows = table.querySelectorAll("tbody tr");
  let visibleCount = 0;
  
  rows.forEach(row => {
    const dateCell = row.cells[0].textContent;
    const rowDate = parseDate(dateCell);
    
    let shouldShow = true;
    
    if (startDate && rowDate < new Date(startDate)) {
      shouldShow = false;
    }
    
    if (endDate && rowDate > new Date(endDate)) {
      shouldShow = false;
    }
    
    row.style.display = shouldShow ? "" : "none";
    if (shouldShow) visibleCount++;
  });
  
  showAlert(`Filtro aplicado: ${visibleCount} itens encontrados`, "success");
}

// Reseta o filtro de data
function resetDateFilter(tabName) {
  DOM.filters[tabName].start.value = "";
  DOM.filters[tabName].end.value = "";
  
  const table = DOM.tables[tabName];
  const rows = table.querySelectorAll("tbody tr");
  rows.forEach(row => row.style.display = "");
  
  showAlert("Filtro removido", "info");
}

// Converte data no formato brasileiro para objeto Date
function parseDate(dateString) {
  if (!dateString || dateString === "-") return new Date(0);
  
  const [day, month, year] = dateString.split('/').map(Number);
  return new Date(year, month - 1, day);
}

// Processa os arquivos selecionados
async function processFiles() {
  if (appState.files.length === 0) {
    showAlert("Nenhum arquivo selecionado para processar", "error");
    return;
  }
  
  try {
    const results = await processFolder(appState.files);
    appState.results = results; // Salva os resultados no estado
    populateTables(results);
    showAlert("Processamento concluído com sucesso!", "success");
    updateStatus(`Processamento concluído. ${appState.files.length} arquivos processados.`, true);
    appState.lastOperation = new Date();
    saveSettings();
  } catch (error) {
    console.error("Erro ao processar arquivos:", error);
    showAlert("Ocorreu um erro ao processar os arquivos", "error");
    updateStatus("Erro ao processar arquivos");
  }
}

// Processa uma pasta de arquivos
async function processFolder(files) {
  showSpinner();
  updateStatus(`Processando ${files.length} arquivos...`);
  
  const results = {
    carta: [],
    cancelamento: [],
    devolucao: []
  };
  
  for (const file of files) {
    if (file.name.endsWith('.xml')) {
      try {
        const xmlData = await readFileAsText(file);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlData, "text/xml");
        
        const values = extractXMLValues(xmlDoc);
        const docType = determineDocumentType(xmlDoc, values);
        
        results[docType].push({
          ...values,
          fileName: file.name,
          rawDate: values.dataEvento // Salva a data original para filtro
        });
        
        updateStatus(`Processado: ${file.name}`);
      } catch (error) {
        console.error(`Erro ao processar ${file.name}:`, error);
        showAlert(`Erro ao processar ${file.name}`, "error");
      }
    }
  }
  
  hideSpinner();
  return results;
}

// Extrai valores do XML
function extractXMLValues(xml) {
  const values = {};
  
  // Extrai tags fixas
  for (const [key, selector] of Object.entries(FIXED_TAGS)) {
    values[key] = getXMLValue(xml, selector);
  }
  
  // Tratamento especial para CNPJ
  if (!values.cnpj || values.cnpj.trim() === "") {
    values.cnpj = getXMLValue(xml, "CNPJ") || 
                 getXMLValue(xml, "emit > CNPJ") || 
                 getXMLValue(xml, "dest > CNPJ") || 
                 getXMLValue(xml, "rem > CNPJ");
  }
  
  // Extrai tags customizadas
  for (const tag of customTags) {
    values[tag] = getXMLValue(xml, tag);
  }
  
  return values;
}

// Determina o tipo de documento - Versão aprimorada
function determineDocumentType(xml, values) {
  // Verifica se é cancelamento (tem justificativa)
  if (values.justificativa && values.justificativa.trim() !== "") {
    return "cancelamento";
  }
  
  // Verifica se é devolução
  const motivo = values.motivo ? values.motivo.toLowerCase() : "";
  const xEvento = xml.getElementsByTagName("infEvento")[0]?.getAttribute("xEvento")?.toLowerCase() || "";
  
  const isDevolucao = 
    motivo.includes("devolução") || motivo.includes("devolucao") ||
    xEvento.includes("devolução") || xEvento.includes("devolucao") ||
    motivo.includes("retorno") || motivo.includes("devolvido");
  
  return isDevolucao ? "devolucao" : "carta";
}

// =============================================
// FUNÇÕES DE INTERFACE
// =============================================

// Alternar entre abas
async function switchTab(tabName) {
  if (appState.currentTab === tabName) return;
  
  try {
    // Desativa a aba atual
    const currentTab = document.getElementById(`aba-${appState.currentTab}`);
    if (currentTab) {
      currentTab.classList.remove("ativa");
      currentTab.style.opacity = 0;
      currentTab.style.transform = "translateY(20px)";
    }
    
    // Atualiza o estado
    appState.currentTab = tabName;
    
    // Atualiza o botão ativo
    DOM.tabs.buttons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    
    // Ativa a nova aba com animação
    const newTab = document.getElementById(`aba-${tabName}`);
    await new Promise(resolve => {
      setTimeout(() => {
        newTab.classList.add("ativa");
        newTab.style.opacity = 1;
        newTab.style.transform = "translateY(0)";
        resolve();
      }, 50);
    });
    
    saveSettings();
  } catch (error) {
    console.error("Erro ao trocar de aba:", error);
  }
}

// Adiciona uma tag customizada
function addCustomTag() {
  const tagName = DOM.customTagInput.value.trim();
  
  if (!tagName) {
    showAlert("Por favor, digite uma tag válida", "error");
    return;
  }
  
  if (customTags.includes(tagName)) {
    showAlert("Esta tag já foi adicionada", "error");
    return;
  }
  
  customTags.push(tagName);
  renderCustomTags();
  DOM.customTagInput.value = "";
  saveSettings();
}

// Remove uma tag customizada
function removeCustomTag(tagName) {
  customTags = customTags.filter(tag => tag !== tagName);
  renderCustomTags();
  saveSettings();
}

// Renderiza as tags customizadas
function renderCustomTags() {
  DOM.customTagsContainer.innerHTML = "";
  
  customTags.forEach(tag => {
    const tagElement = document.createElement("div");
    tagElement.className = "tag";
    tagElement.innerHTML = `
      ${tag}
      <i class="fas fa-times" onclick="removeCustomTag('${tag}')"></i>
    `;
    DOM.customTagsContainer.appendChild(tagElement);
  });
}

// =============================================
// FUNÇÕES DE MANIPULAÇÃO DE ARQUIVOS
// =============================================

// Lê um arquivo como texto
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = error => reject(error);
    reader.readAsText(file);
  });
}

// Manipula a seleção de arquivos
function handleFileSelection(e) {
  const files = Array.from(e.target.files);
  handleDroppedFiles(files);
}

// Manipula arquivos arrastados e soltos
function handleDroppedFiles(files) {
  const xmlFiles = files.filter(file => file.name.endsWith('.xml'));
  
  if (xmlFiles.length === 0) {
    showAlert("Nenhum arquivo XML encontrado", "error");
    return;
  }
  
  appState.files = xmlFiles;
  DOM.processBtn.disabled = false;
  updateStatus(`${xmlFiles.length} arquivo(s) XML pronto(s) para processar`);
  showAlert(`${xmlFiles.length} arquivo(s) XML selecionado(s)`, "success");
}

// =============================================
// FUNÇÕES DE TABELA
// =============================================

// Preenche as tabelas com os resultados
function populateTables(results) {
  // Carta de Correção
  populateTable("carta", results.carta, (item) => [
    formatDate(item.dataEvento),
    extractNotaFiscal(item.chave),
    extractSerie(item.chave),
    formatCNPJ(item.cnpj),
    item.correcao || "-",
    item.fileName
  ]);
  
  // Cancelamento
  populateTable("cancelamento", results.cancelamento, (item) => [
    formatDate(item.dataEvento),
    extractNotaFiscal(item.chave),
    extractSerie(item.chave),
    formatCNPJ(item.cnpj),
    item.justificativa || "-",
    item.fileName
  ]);
  
  // Devolução
  populateTable("devolucao", results.devolucao, (item) => [
    formatDate(item.dataEvento),
    extractNotaFiscal(item.chave),
    extractSerie(item.chave),
    formatCNPJ(item.cnpj),
    item.nome || "-",
    item.motivo || "-",
    item.valorNota ? `R$ ${parseFloat(item.valorNota).toFixed(2)}` : "-",
    createVendedorDropdown(item.chave, item.fileName),
    item.fileName
  ]);

  // Adiciona eventos aos dropdowns após a tabela ser populada
  setTimeout(() => {
    document.querySelectorAll('.vendedor-dropdown').forEach(dropdown => {
      dropdown.addEventListener('change', function() {
        const chave = this.dataset.chave;
        const vendedor = this.value;
        if (vendedor && vendedor !== "Sem Vendedor Selecionado") {
          this.style.border = "1px solid #3B82F6";
        }
      });
    });
  }, 100);
  
  checkEmptyTables();
}

// Preenche uma tabela específica
function populateTable(type, items, rowMapper) {
  const tableBody = DOM.tables[type].querySelector("tbody");
  tableBody.innerHTML = "";
  
  items.forEach(item => {
    const row = document.createElement("tr");
    rowMapper(item).forEach(cellContent => {
      const cell = document.createElement("td");
      cell.innerHTML = cellContent;
      row.appendChild(cell);
    });
    tableBody.appendChild(row);
  });
}

// Cria dropdown de vendedores para devolução
function createVendedorDropdown(chave, fileName) {
  const dropdownId = `vendedor-${chave}`;
  const currentVendedor = appState.vendedoresSelecionados[chave] || VENDEDORES[0];
  
  return `
    <select id="${dropdownId}" data-chave="${chave}" data-file="${fileName}" class="vendedor-dropdown">
      ${VENDEDORES.map(v => `<option value="${v}" ${v === currentVendedor ? 'selected' : ''}>${v}</option>`).join('')}
    </select>
  `;
}

// Verifica tabelas vazias
function checkEmptyTables() {
  for (const [type, table] of Object.entries(DOM.tables)) {
    const isEmpty = table.querySelector("tbody").children.length === 0;
    DOM.emptyStates[type].style.display = isEmpty ? "flex" : "none";
    table.style.display = isEmpty ? "none" : "table";
  }
}

// =============================================
// FUNÇÕES DE VENDEDORES (DEVOLUÇÃO)
// =============================================

// Salva os vendedores selecionados
function salvarVendedores() {
  const dropdowns = document.querySelectorAll('.vendedor-dropdown');
  let savedCount = 0;

  dropdowns.forEach(dropdown => {
    const chave = dropdown.dataset.chave;
    const vendedor = dropdown.value;
    
    if (vendedor && vendedor !== "Sem Vendedor Selecionado") {
      appState.vendedoresSelecionados[chave] = vendedor;
      savedCount++;
      
      // Adiciona feedback visual
      dropdown.style.border = "2px solid #10B981";
      setTimeout(() => {
        dropdown.style.border = "1px solid #D1D5DB";
      }, 1000);
    }
  });

  saveSettings();
  
  if (savedCount > 0) {
    showAlert(`${savedCount} vendedor(es) salvos com sucesso!`, "success");
  } else {
    showAlert("Nenhum vendedor selecionado para salvar", "warning");
  }
}

// Habilita edição dos vendedores
function editarVendedores() {
  const dropdowns = document.querySelectorAll('.vendedor-dropdown');
  dropdowns.forEach(dropdown => {
    dropdown.style.backgroundColor = "#EFF6FF";
    dropdown.disabled = false;
  });
  showAlert("Modo de edição ativado - selecione os vendedores e clique em Salvar", "info");
}

// =============================================
// FUNÇÕES DE EXPORTAÇÃO
// =============================================

// Configura os botões de exportação
function setupExportButtons() {
  const exportMap = {
    'tabelaCarta': 'Cartas_Correcao',
    'tabelaCancelamento': 'Cancelamentos',
    'tabelaDevolucao': 'Devolucoes'
  };
  
  document.querySelectorAll('.export-button').forEach(button => {
    button.addEventListener('click', function() {
      const tabId = this.closest('.tab').id.replace('aba-', '');
      const tableId = `tabela${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`;
      exportToExcel(tableId, exportMap[tableId]);
    });
  });
}

// Exporta tabela para Excel
function exportToExcel(tableId, fileName) {
  try {
    const table = document.getElementById(tableId);
    
    // Clona a tabela para não modificar a original
    const clone = table.cloneNode(true);
    
    // Remove os dropdowns de vendedores (se houver)
    const dropdowns = clone.querySelectorAll('.vendedor-dropdown');
    dropdowns.forEach(dropdown => {
      const selectedValue = dropdown.options[dropdown.selectedIndex].text;
      dropdown.parentNode.innerHTML = selectedValue;
    });
    
    // Converte para Excel
    const workbook = XLSX.utils.table_to_book(clone);
    
    // Criar nome de arquivo com data
    const dateStr = new Date().toISOString().slice(0, 10);
    const finalFileName = `${fileName}_${dateStr}.xlsx`;
    
    XLSX.writeFile(workbook, finalFileName);
    showAlert(`Exportação para ${finalFileName} concluída!`, "success");
  } catch (error) {
    console.error("Erro ao exportar para Excel:", error);
    showAlert("Erro ao exportar para Excel", "error");
  }
}

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

// Obtém valor do XML
function getXMLValue(xml, selector) {
  if (!selector) return "";
  
  // Primeiro tenta o caminho completo (se houver >)
  if (selector.includes('>')) {
    const parts = selector.split('>').map(p => p.trim());
    let element = xml;
    
    for (const part of parts) {
      const elements = element.getElementsByTagName(part);
      if (elements.length === 0) break;
      element = elements[0];
    }
    
    if (element && element.textContent) return element.textContent;
  }
  
  // Se não encontrar, busca a tag em qualquer nível
  const elements = xml.getElementsByTagName(selector);
  if (elements.length > 0) {
    return elements[0].textContent;
  }
  
  return "";
}

// Função formatDate atualizada (mantém todas as funcionalidades)
function formatDate(dateString) {
  if (!dateString) return "-";
  
  try {
    // Primeiro tenta extrair apenas a parte da data (formato ISO)
    if (dateString.includes('T')) {
      const [datePart] = dateString.split('T');
      const [year, month, day] = datePart.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Fallback para outros formatos de data
    const date = new Date(dateString);
    if (!isNaN(date)) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    return dateString; // Retorna o original se não conseguir formatar
  } catch (e) {
    return dateString; // Fallback seguro
  }
}

// Função parseDate para filtros (mantém a funcionalidade original)
function parseDate(dateString) {
  if (!dateString || dateString === "-") return new Date(0);
  
  // Aceita tanto dd/mm/aaaa quanto aaaa-mm-dd
  if (dateString.includes('/')) {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  } else if (dateString.includes('-')) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  return new Date(dateString); // Fallback
}

// Função exportToExcel atualizada (mantém filtros e funcionalidades)
function exportToExcel(tableId, fileName) {
  try {
    const table = document.getElementById(tableId);
    const clone = table.cloneNode(true);
    
    // Processa apenas células de data (mantém os filtros)
    const dateCells = clone.querySelectorAll('td:first-child');
    dateCells.forEach(cell => {
      if (cell.textContent.includes('/')) {
        cell.textContent = cell.textContent.split(' ')[0]; // Remove hora se existir
      }
    });
    
    // Restante do código permanece igual
    const workbook = XLSX.utils.table_to_book(clone);
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
    showAlert(`Exportação concluída!`, "success");
  } catch (error) {
    console.error("Erro ao exportar:", error);
    showAlert("Erro ao exportar para Excel", "error");
  }
}

// Formata CNPJ
function formatCNPJ(cnpj) {
  if (!cnpj || cnpj === "-") return "-";
  // Remove caracteres não numéricos
  const numeros = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (numeros.length !== 14) return cnpj;
  
  return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

// Extrai número da nota fiscal da chave
function extractNotaFiscal(chave) {
  if (!chave) return "-";
  // A nota fiscal geralmente está entre as posições 25-34 da chave
  return chave.length >= 34 ? chave.substring(25, 34) : "-";
}

// Extrai série da nota fiscal da chave
function extractSerie(chave) {
  if (!chave) return "-";
  // A série geralmente está entre as posições 22-25 da chave
  return chave.length >= 25 ? chave.substring(22, 25) : "-";
}

// Configura inputs de busca
function setupSearchInputs() {
  DOM.searchInputs.forEach(input => {
    input.addEventListener('input', function() {
      const tableId = this.dataset.table;
      const searchTerm = this.value.toLowerCase();
      const table = document.getElementById(tableId);
      const rows = table.querySelectorAll('tbody tr');
      
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? "" : "none";
      });
    });
  });
}

// Mostrar spinner
function showSpinner() {
  DOM.spinner.style.display = "flex";
  DOM.processBtn.disabled = true;
}

// Ocultar spinner
function hideSpinner() {
  DOM.spinner.style.display = "none";
  DOM.processBtn.disabled = false;
}

// Atualizar barra de status
function updateStatus(message, isSuccess = false) {
  DOM.statusBar.textContent = message;
  DOM.statusBar.classList.toggle("active", isSuccess);
}

// Mostrar alerta
function showAlert(message, type = "info") {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
    <span>${message}</span>
    <i class="fas fa-times close-alert"></i>
  `;
  
  DOM.alertContainer.appendChild(alert);
  
  // Fechar alerta automaticamente após 5 segundos
  setTimeout(() => {
    alert.classList.add("fade-out");
    setTimeout(() => alert.remove(), 300);
  }, 5000);
  
  // Fechar ao clicar no X
  alert.querySelector(".close-alert").addEventListener("click", () => {
    alert.classList.add("fade-out");
    setTimeout(() => alert.remove(), 300);
  });
}

// Verifica suporte ao XLSX
function checkXLSXSupport() {
  if (!window.XLSX) {
    showAlert("Biblioteca de exportação para Excel não carregada corretamente", "error");
  }
}

// =============================================
// PERSISTÊNCIA DE CONFIGURAÇÕES
// =============================================

// Carrega configurações salvas
function loadSettings() {
  const savedSettings = localStorage.getItem("rlx-xml-reader-settings");
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      customTags = settings.customTags || [];
      appState.vendedoresSelecionados = settings.vendedoresSelecionados || {};
      appState.currentTab = settings.currentTab || "carta";
      
      renderCustomTags();
      switchTab(appState.currentTab);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  }
}

// Salva configurações
function saveSettings() {
  const settings = {
    customTags,
    vendedoresSelecionados: appState.vendedoresSelecionados,
    currentTab: appState.currentTab,
    lastOperation: appState.lastOperation
  };
  
  localStorage.setItem("rlx-xml-reader-settings", JSON.stringify(settings));
}

// =============================================
// INICIALIZAÇÃO
// =============================================
document.addEventListener("DOMContentLoaded", init);
window.removeCustomTag = removeCustomTag;
