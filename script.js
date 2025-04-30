function mostrarAba(aba) {
    document.querySelectorAll('.aba').forEach(a => a.classList.remove('ativa'));
    document.getElementById(aba).classList.add('ativa');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[aba === 'carta' ? 0 : 1].classList.add('active');
  }
  
  function processarArquivos(files, tipo) {
    const tabela = document.querySelector(`#tabela${tipo === 'carta' ? 'Carta' : 'Cancelamento'} tbody`);
    const contador = document.getElementById(`contador${tipo === 'carta' ? 'Carta' : 'Cancelamento'}`);
    tabela.innerHTML = '';
    let contadorLinhas = 0;
  
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const xml = new DOMParser().parseFromString(e.target.result, 'text/xml');
        const dhEvento = xml.querySelector('dhEvento')?.textContent || '';
        const xCorrecao = xml.querySelector('xCorrecao')?.textContent || '';
        const xJust = xml.querySelector('xJust')?.textContent || '';
        const motivo = xCorrecao || xJust || '';
  
        if ((tipo === 'carta' && !motivo.toLowerCase().includes('carta de corre')) ||
            (tipo === 'cancelamento' && !motivo.toLowerCase().includes('cancelamento'))) return;
  
        const chNFe = xml.querySelector('chNFe')?.textContent || '';
        const cnpj = chNFe.substring(6, 20);
        const serie = chNFe.substring(22, 25);
        const nota = chNFe.substring(25, 34);
  
        const tr = `<tr><td>${dhEvento}</td><td>${nota}</td><td>${serie}</td><td>${cnpj}</td><td>${motivo}</td><td>${tipo === 'carta' ? xCorrecao : xJust}</td></tr>`;
        tabela.innerHTML += tr;
        contadorLinhas++;
        contador.textContent = `${contadorLinhas} registro(s) carregado(s).`;
      };
      reader.readAsText(file);
    });
  }
  
  function exportar(tipo) {
    const formato = 'excel'; // você pode adaptar para escolher entre excel ou pdf
    const tabela = document.querySelector(`#tabela${tipo === 'carta' ? 'Carta' : 'Cancelamento'}`);
    if (formato === 'excel') {
      const wb = XLSX.utils.table_to_book(tabela);
      XLSX.writeFile(wb, `export_${tipo}.xlsx`);
    } else if (formato === 'pdf') {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.autoTable({ html: tabela });
      doc.save(`export_${tipo}.pdf`);
    }
  }
  