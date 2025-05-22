// =============================================
// CONFIGURAÇÕES E CONSTANTES
// =============================================
const FIXED_TAGS = {
  chave: "chNFe",
  dataEvento: "dhEvento",
   dataEmissao: "dhEmi",
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

function formatDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return "-";
  
  // Remove horário e timezone (ex: "04/07/2025 03:00:00" → "04/07/2025")
  const dateOnly = dateString.split(' ')[0];
  
  // Verifica formato DD/MM/AAAA
  const brFormat = dateOnly.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brFormat) return dateOnly;
  
  // Verifica formato AAAA-MM-DD
  const isoFormat = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoFormat) return `${isoFormat[3]}/${isoFormat[2]}/${isoFormat[1]}`;
  
  // Tenta converter como objeto Date
  try {
    const dateObj = new Date(dateString);
    if (!isNaN(dateObj)) {
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    console.warn("Formato de data inválido:", dateString);
  }
  
  return "-";
}

// =============================================
// FUNÇÃO exportToExcel ATUALIZADA (GARANTE TEXTO PURO)
// =============================================
function exportToExcel(tableId, fileName) {
  try {
    const table = document.getElementById(tableId);
    const clone = table.cloneNode(true);
    
    // Processa todas as células para garantir formato limpo
    clone.querySelectorAll('td').forEach(cell => {
      const content = cell.textContent.trim();
      
      // Se for uma data no formato DD/MM/AAAA ou AAAA-MM-DD
      if (content.match(/^(\d{2}\/\d{2}\/\d{4})$/) || content.match(/^(\d{4}-\d{2}-\d{2})$/)) {
        // Força como texto puro (adiciona aspas simples no início)
        cell.textContent = `'${formatDate(content)}`;
      }
    });
    
    // Processa todas as células para garantir datas sem hora
    clone.querySelectorAll('td').forEach(cell => {
      const content = cell.textContent.trim();
      
      // Se for data com hora (DD/MM/AAAA HH:MM:SS)
      if (content.match(/^(\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2}:\d{2})$/)) {
        cell.textContent = content.split(' ')[0];
      }
      // Se for data ISO com hora (AAAA-MM-DD HH:MM:SS)
      else if (content.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/)) {
        const [datePart] = content.split(' ');
        const [year, month, day] = datePart.split('-');
        cell.textContent = `${day}/${month}/${year}`;
      }
    });

    const workbook = XLSX.utils.table_to_book(clone);
    const exportDate = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    XLSX.writeFile(workbook, `${fileName}_${exportDate}.xlsx`);
    showAlert("Exportação concluída com datas formatadas corretamente!", "success");
  } catch (error) {
    console.error("Erro na exportação:", error);
    showAlert("Falha ao exportar para Excel", "error");
  }
}

// =============================================
// FUNÇÕES DE PROCESSAMENTO
// =============================================

function init() {
  checkXLSXSupport();
  setupEventListeners();
  setupDateFilters();
  checkEmptyTables();
  updateStatus("Aguardando arquivos XML...");
  loadSettings();
  
  setTimeout(() => {
    document.getElementById(`aba-${appState.currentTab}`).classList.add("ativa");
    document.getElementById(`aba-${appState.currentTab}`).style.opacity = 1;
  }, 100);
}

function setupEventListeners() {
  DOM.tabs.buttons.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  
  DOM.addTagBtn.addEventListener("click", addCustomTag);
  DOM.customTagInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addCustomTag();
  });
  
  DOM.fileInput.addEventListener("change", handleFileSelection);
  
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
  
  DOM.processBtn.addEventListener("click", processFiles);
  setupExportButtons();
  setupSearchInputs();
  document.getElementById("salvarVendedores")?.addEventListener("click", salvarVendedores);
  document.getElementById("editarVendedores")?.addEventListener("click", editarVendedores);
}

async function processFiles() {
  if (appState.files.length === 0) {
    showAlert("Nenhum arquivo selecionado para processar", "error");
    return;
  }
  
  try {
    const results = await processFolder(appState.files);
    appState.results = results;
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
          rawDate: values.dataEvento
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

function extractXMLValues(xml) {
  const values = {};
  
  for (const [key, selector] of Object.entries(FIXED_TAGS)) {
    const value = getXMLValue(xml, selector);
    
    if (key === 'dataEvento') {
      values[key] = value ? value.split(' ')[0] : ""; // Remove hora se existir
    } else {
      values[key] = value;
    }
  }
  
  if (!values.cnpj || values.cnpj.trim() === "") {
    values.cnpj = getXMLValue(xml, "CNPJ") || 
                 getXMLValue(xml, "emit > CNPJ") || 
                 getXMLValue(xml, "dest > CNPJ") || 
                 getXMLValue(xml, "rem > CNPJ");
  }
  
  for (const tag of customTags) {
    values[tag] = getXMLValue(xml, tag);
  }
  
  return values;
}

function determineDocumentType(xml, values) {
  if (values.justificativa && values.justificativa.trim() !== "") {
    return "cancelamento";
  }
  
  const motivo = values.motivo ? values.motivo.toLowerCase() : "";
  const xEvento = xml.getElementsByTagName("infEvento")[0]?.getAttribute("xEvento")?.toLowerCase() || "";
  
  const isDevolucao = 
    motivo.includes("devolução") || motivo.includes("devolucao") ||
    xEvento.includes("devolução") || xEvento.includes("devolucao") ||
    motivo.includes("retorno") || motivo.includes("devolvido");
  
  return isDevolucao ? "devolucao" : "carta";
}

// =============================================
// FUNÇÕES DE TABELA
// =============================================

function populateTables(results) {
  populateTable("carta", results.carta, (item) => [
    formatDate(item.dataEvento),
    extractNotaFiscal(item.chave),
    extractSerie(item.chave),
    formatCNPJ(item.cnpj),
    item.correcao || "-",
    item.fileName
  ]);
  
  populateTable("cancelamento", results.cancelamento, (item) => [
    formatDate(item.dataEvento),
    extractNotaFiscal(item.chave),
    extractSerie(item.chave),
    formatCNPJ(item.cnpj),
    item.justificativa || "-",
    item.fileName
  ]);
  
   populateTable("devolucao", results.devolucao, (item) => [
    formatDate(item.dataEmissao || item.dataEvento),  // Prioriza dataEmissao, fallback para dataEvento
    extractNotaFiscal(item.chave),
    extractSerie(item.chave),
    formatCNPJ(item.cnpj),
    item.nome || "-",
    item.motivo || "-",
    item.valorNota ? `R$ ${parseFloat(item.valorNota).toFixed(2)}` : "-",
    createVendedorDropdown(item.chave, item.fileName),
    item.fileName
  ]);
  ;

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

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

function parseDate(dateString) {
  if (!dateString || dateString === "-") return null;
  
  // Formato DD/MM/AAAA
  const parts = dateString.split('/');
  if (parts.length === 3) {
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  
  // Formato AAAA-MM-DD
  const isoParts = dateString.split('-');
  if (isoParts.length === 3) {
    return new Date(isoParts[0], isoParts[1] - 1, isoParts[2]);
  }
  
  return null;
}
function getXMLValue(xml, selector) {
  if (!selector) return "";
  
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
  
  const elements = xml.getElementsByTagName(selector);
  if (elements.length > 0) {
    return elements[0].textContent;
  }
  
  return "";
}

function formatCNPJ(cnpj) {
  if (!cnpj || cnpj === "-") return "-";
  const numeros = cnpj.replace(/\D/g, '');
  if (numeros.length !== 14) return cnpj;
  return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function extractNotaFiscal(chave) {
  if (!chave) return "-";
  return chave.length >= 34 ? chave.substring(25, 34) : "-";
}

function extractSerie(chave) {
  if (!chave) return "-";
  return chave.length >= 25 ? chave.substring(22, 25) : "-";
}

function createVendedorDropdown(chave, fileName) {
  const dropdownId = `vendedor-${chave}`;
  const currentVendedor = appState.vendedoresSelecionados[chave] || VENDEDORES[0];
  
  return `
    <select id="${dropdownId}" data-chave="${chave}" data-file="${fileName}" class="vendedor-dropdown">
      ${VENDEDORES.map(v => `<option value="${v}" ${v === currentVendedor ? 'selected' : ''}>${v}</option>`).join('')}
    </select>
  `;
}

// =============================================
// FUNÇÕES DE INTERFACE
// =============================================

function setupDateFilters() {
  for (const [tabName, filter] of Object.entries(DOM.filters)) {
    filter.button.addEventListener("click", () => applyDateFilter(tabName));
    filter.reset.addEventListener("click", () => resetDateFilter(tabName));
  }
}

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

function resetDateFilter(tabName) {
  DOM.filters[tabName].start.value = "";
  DOM.filters[tabName].end.value = "";
  
  const table = DOM.tables[tabName];
  const rows = table.querySelectorAll("tbody tr");
  rows.forEach(row => row.style.display = "");
  
  showAlert("Filtro removido", "info");
}

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

function checkEmptyTables() {
  for (const [type, table] of Object.entries(DOM.tables)) {
    const isEmpty = table.querySelector("tbody").children.length === 0;
    DOM.emptyStates[type].style.display = isEmpty ? "flex" : "none";
    table.style.display = isEmpty ? "none" : "table";
  }
}

function showSpinner() {
  DOM.spinner.style.display = "flex";
  DOM.processBtn.disabled = true;
}

function hideSpinner() {
  DOM.spinner.style.display = "none";
  DOM.processBtn.disabled = false;
}

function updateStatus(message, isSuccess = false) {
  DOM.statusBar.textContent = message;
  DOM.statusBar.classList.toggle("active", isSuccess);
}

function showAlert(message, type = "info") {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
    <span>${message}</span>
    <i class="fas fa-times close-alert"></i>
  `;
  
  DOM.alertContainer.appendChild(alert);
  
  setTimeout(() => {
    alert.classList.add("fade-out");
    setTimeout(() => alert.remove(), 300);
  }, 5000);
  
  alert.querySelector(".close-alert").addEventListener("click", () => {
    alert.classList.add("fade-out");
    setTimeout(() => alert.remove(), 300);
  });
}

function checkXLSXSupport() {
  if (!window.XLSX) {
    showAlert("Biblioteca de exportação para Excel não carregada corretamente", "error");
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = error => reject(error);
    reader.readAsText(file);
  });
}

function handleFileSelection(e) {
  const files = Array.from(e.target.files);
  handleDroppedFiles(files);
}

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

function removeCustomTag(tagName) {
  customTags = customTags.filter(tag => tag !== tagName);
  renderCustomTags();
  saveSettings();
}

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

function salvarVendedores() {
  const dropdowns = document.querySelectorAll('.vendedor-dropdown');
  let savedCount = 0;

  dropdowns.forEach(dropdown => {
    const chave = dropdown.dataset.chave;
    const vendedor = dropdown.value;
    
    if (vendedor && vendedor !== "Sem Vendedor Selecionado") {
      appState.vendedoresSelecionados[chave] = vendedor;
      savedCount++;
      
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

function editarVendedores() {
  const dropdowns = document.querySelectorAll('.vendedor-dropdown');
  dropdowns.forEach(dropdown => {
    dropdown.style.backgroundColor = "#EFF6FF";
    dropdown.disabled = false;
  });
  showAlert("Modo de edição ativado - selecione os vendedores e clique em Salvar", "info");
}

async function switchTab(tabName) {
  if (appState.currentTab === tabName) return;
  
  try {
    const currentTab = document.getElementById(`aba-${appState.currentTab}`);
    if (currentTab) {
      currentTab.classList.remove("ativa");
      currentTab.style.opacity = 0;
      currentTab.style.transform = "translateY(20px)";
    }
    
    appState.currentTab = tabName;
    
    DOM.tabs.buttons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    
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

// =============================================
// PERSISTÊNCIA DE CONFIGURAÇÕES
// =============================================

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
