document.title = "APP RLX LEITOR XML";

// Mostrar/ocultar abas
function mostrarAba(abaId) {
  document.querySelectorAll('.aba').forEach(div => div.classList.remove('ativa'));
  document.getElementById(`aba-${abaId}`).classList.add('ativa');

  document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
  const index = abaId === 'carta' ? 0 : abaId === 'cancelamento' ? 1 : 2;
  document.querySelectorAll('.tabs button')[index].classList.add('active');
}

// SPINNER
function mostrarSpinner(mostrar) {
  document.getElementById("spinner").style.display = mostrar ? "flex" : "none";
}

// Lista de vendedores embutida
const vendedores = [
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

// Cria o select de vendedor
function criarSelectVendedor() {
  const select = document.createElement("select");
  vendedores.forEach(nome => {
    const opt = document.createElement("option");
    opt.value = nome;
    opt.textContent = nome;
    select.appendChild(opt);
  });
  return select;
}

// Lê XMLs
function lerXML(tipo) {
  const input = document.getElementById(`xml${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
  const files = [...input.files];
  if (files.length === 0) return;

  const tabela = document.querySelector(`#tabela-${tipo} tbody`);
  tabela.innerHTML = "";

  mostrarSpinner(true);
  let lidos = 0;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const xml = new DOMParser().parseFromString(reader.result, "text/xml");
        if (!xml || xml.getElementsByTagName("parsererror").length > 0) {
          console.error("Erro ao analisar XML:", file.name);
          return;
        }

        if (tipo === "devolucao") {
          const cnpj = xml.querySelector("dest > CNPJ")?.textContent || "";
          const nome = xml.querySelector("dest > xNome")?.textContent || "";
          const nota = xml.querySelector("ide > nNF")?.textContent || "";
          const serie = xml.querySelector("ide > serie")?.textContent || "";
          const data = xml.querySelector("ide > dhEmi")?.textContent?.slice(0, 10) || "";
          const valor = xml.querySelector("det > prod > vProd")?.textContent || "";
          const municipio = xml.querySelector("dest > enderDest > xMun")?.textContent || "";
          const natOp = xml.querySelector("ide > natOp")?.textContent || "";
          const descricao = xml.querySelector("infAdic > infCpl")?.textContent || "";

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${cnpj}</td>
            <td>${nome}</td>
            <td>${nota}</td>
            <td>${serie}</td>
            <td>${data}</td>
            <td>${valor}</td>
            <td>${municipio}</td>
            <td>${natOp}</td>
            <td>${descricao}</td>
          `;
          const tdVendedor = document.createElement("td");
          tdVendedor.appendChild(criarSelectVendedor());
          tr.appendChild(tdVendedor);
          tabela.appendChild(tr);

        } else {
          const data = xml.querySelector("dhEvento")?.textContent?.slice(0, 10) || "";
          const chave = xml.querySelector("chNFe")?.textContent || "";
          const nota = chave.slice(25, 34);
          const serie = chave.slice(22, 25);
          const cnpj = xml.querySelector("CNPJ")?.textContent || "";
          const motivo = xml.querySelector("xMotivo")?.textContent || "";
          const descricao = tipo === "carta"
            ? xml.querySelector("xCorrecao")?.textContent || ""
            : xml.querySelector("xJust")?.textContent || "";

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${data}</td>
            <td>${nota}</td>
            <td>${serie}</td>
            <td>${cnpj}</td>
            <td>${motivo}</td>
            <td>${descricao}</td>
          `;
          tabela.appendChild(tr);
        }

      } catch (e) {
        console.error("Erro ao processar arquivo:", file.name, e);
      }

      lidos++;
      if (lidos === files.length) mostrarSpinner(false);
    };
    reader.readAsText(file);
  });
}
