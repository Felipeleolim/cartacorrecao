const vendedores = [
  "Ariana Gallo", "André Godoy", "André Gama", "Anderson Mendes",
  "Jonas Rocha", "Paulo Henrique", "Israel Gomes", "Marcelo Ilhesca",
  "Cristiano Alves", "Renata Bernardes"
];

function mostrarAba(abaId) {
  document.querySelectorAll('.aba').forEach(aba => aba.classList.remove('ativa'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(abaId).classList.add('ativa');
  document.querySelector(`[onclick="mostrarAba('${abaId}')"]`).classList.add('active');
}

function gerarSelectVendedor() {
  return `<select class="select-vendedor">
    <option value="">Selecionar</option>
    ${vendedores.map(nome => `<option value="${nome}">${nome}</option>`).join('')}
  </select>`;
}

function processarArquivos(arquivos, tipo) {
  const tabela = document.querySelector(`#tabela${capitalize(tipo)} tbody`);
  const contador = document.getElementById(`contador${capitalize(tipo)}`);
  tabela.innerHTML = '';
  let count = 0;

  Array.from(arquivos).forEach(arquivo => {
    const reader = new FileReader();
    reader.onload = () => {
      const xml = new DOMParser().parseFromString(reader.result, 'text/xml');
      const data = xml.querySelector('dhEmi')?.textContent?.substring(0, 10);
      const nota = xml.querySelector('ide > nNF')?.textContent;
      const serie = xml.querySelector('ide > serie')?.textContent;
      const cnpj = xml.querySelector('emit > CNPJ')?.textContent;
      const motivo = xml.querySelector('infEvento > xMotivo')?.textContent || '';
      const descricao = xml.querySelector('infEvento > detEvento > xCorrecao')?.textContent || xml.querySelector('infEvento > detEvento > descEvento')?.textContent || '';
      const nome = xml.querySelector('emit > xNome')?.textContent || '';
      const vprod = xml.querySelector('total > ICMSTot > vProd')?.textContent || '';
      const xmun = xml.querySelector('dest > xMun')?.textContent || '';
      const natOp = xml.querySelector('ide > natOp')?.textContent || '';
      const infcpl = xml.querySelector('infAdic > infCpl')?.textContent || '';

      if (tipo === 'devolucao') {
        const novaLinha = document.createElement('tr');
        novaLinha.innerHTML = `
          <td>${formatarCNPJ(cnpj)}</td>
          <td>${nome}</td>
          <td>${nota}</td>
          <td>${serie}</td>
          <td>${formatarData(data)}</td>
          <td>${vprod}</td>
          <td>${xmun}</td>
          <td>${natOp}</td>
          <td>${infcpl}</td>
          <td>${gerarSelectVendedor()}</td>
        `;
        tabela.appendChild(novaLinha);
      } else {
        tabela.innerHTML += `
          <tr>
            <td>${formatarData(data)}</td>
            <td>${nota}</td>
            <td>${serie}</td>
            <td>${formatarCNPJ(cnpj)}</td>
            <td>${motivo}</td>
            <td>${descricao}</td>
          </tr>
        `;
      }

      count++;
      contador.textContent = `${count} arquivos processados.`;
    };
    reader.readAsText(arquivo);
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatarCNPJ(cnpj) {
  return cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatarData(data) {
  if (!data) return '';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

function exportar(tipo) {
  const tabela = document.querySelector(`#tabela${capitalize(tipo)}`);
  const tempTabela = tabela.cloneNode(true);

  tempTabela.querySelectorAll('select').forEach(select => {
    const td = document.createElement('td');
    td.textContent = select.value || 'Não selecionado';
    select.parentNode.replaceChild(td, select);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(tempTabela);
  XLSX.utils.book_append_sheet(wb, ws, capitalize(tipo));
  XLSX.writeFile(wb, `${tipo}.xlsx`);
}
