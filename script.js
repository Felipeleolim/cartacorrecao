function formatarDataISO(dataISO) {
    if (!dataISO) return '';
    const data = new Date(dataISO);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }
  function mostrarAba(abaId) {
    const abas = document.querySelectorAll('.aba');
    const botoes = document.querySelectorAll('.tab-btn');
  
    abas.forEach(aba => aba.classList.remove('ativa'));
    botoes.forEach(btn => btn.classList.remove('active'));
  
    document.getElementById(abaId).classList.add('ativa');
    document.querySelector(`.tab-btn[onclick*="${abaId}"]`).classList.add('active');
  }
  
  function exportar(tipo) {
    const tabela = document.querySelector(`#tabela${tipo === 'carta' ? 'Carta' : 'Cancelamento'}`);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(tabela);
    XLSX.utils.book_append_sheet(wb, ws, tipo === 'carta' ? 'Carta de Correção' : 'Cancelamento');
  
    const nomeArquivo = tipo === 'carta' ? 'CartaDeCorrecao.xlsx' : 'Cancelamento.xlsx';
    XLSX.writeFile(wb, nomeArquivo);
  }
  
  function processarArquivos(files, tipo) {
    const tabela = document.querySelector(`#tabela${tipo === 'carta' ? 'Carta' : 'Cancelamento'} tbody`);
    const contador = document.querySelector(`#contador${tipo === 'carta' ? 'Carta' : 'Cancelamento'}`);
    tabela.innerHTML = '';
    let total = 0;
  
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const xml = new DOMParser().parseFromString(e.target.result, 'text/xml');
        const tpEvento = xml.querySelector('tpEvento')?.textContent;
  
        if ((tipo === 'carta' && tpEvento === '110110') || (tipo === 'cancelamento' && tpEvento === '110111')) {
          const dhEvento = xml.querySelector('dhEvento')?.textContent || '';
          const dataFormatada = formatarDataISO(dhEvento);
  
          const chNFe = xml.querySelector('chNFe')?.textContent || '';
          const nota = chNFe.substring(25, 34);
          const serie = chNFe.substring(22, 25);
          const cnpj = chNFe.substring(6, 20);
  
          let motivo = '';
          let descricao = '';
  
          if (tipo === 'carta') {
            motivo = 'Carta de Correção';
            descricao = xml.querySelector('xCorrecao')?.textContent || '';
          } else if (tipo === 'cancelamento') {
            motivo = 'Cancelamento';
            descricao = xml.querySelector('xJust')?.textContent || '';
          }
  
          const tr = `
            <tr>
              <td>${dataFormatada}</td>
              <td>${nota}</td>
              <td>${serie}</td>
              <td>${cnpj}</td>
              <td>${motivo}</td>
              <td>${descricao}</td>
            </tr>`;
          tabela.innerHTML += tr;
          total++;
        }
      };
      reader.readAsText(file);
    });
  
    setTimeout(() => {
      contador.textContent = `Total de XMLs lidos: ${tabela.rows.length}`;
    }, 300);
  }
  
