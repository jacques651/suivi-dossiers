// src/components/DocumentHeader.tsx
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import dayjs from 'dayjs';
import { ParametreGeneral } from './referentiels/types';

type Orientation = 'portrait' | 'landscape';

export const usePrint = () => {
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadParams = async () => {
      try {
        const result = await invoke('get_parametres_generaux');
        const data = result as ParametreGeneral[];

        const paramsMap: Record<string, string> = {};
        data.forEach(p => {
          paramsMap[p.Code] = p.Valeur;
        });

        setParams(paramsMap);
      } catch (error) {
        console.error('Erreur chargement paramètres:', error);
      }
    };

    loadParams();
  }, []);

  const printDocument = (
    content: string,
    title: string,
    orientation: Orientation = 'portrait',
    _showHeader: boolean = true,
    signataire?: any  ) => {
    const logo = params.LOGO_PATH || '';
    const ministere = params.MINISTERE || 'MINISTERE DE LA SECURITE';
    const cabinet = params.CABINET || 'CABINET';
    const service = params.SERVICE || 'INSPECTION TECHNIQUE DES SERVICES';
    const reference = params.REFERENCE || 'N°2025 ______/MISECU/CAB/ITS/CONF';
    const pays = params.PAYS || 'BURKINA FASO';
    const devise = params.DEVISE || 'La Patrie ou la Mort, nous vaincrons';
    const expediteur = signataire ? `${signataire.Grade || ''} ${signataire.Prenom || ''} ${signataire.Nom || ''}`.trim() : (params.EXPEDITEUR || "L'Inspecteur Général des Services");

    // Construction de la signature si fournie
    let signatureHtml = '';
    if (signataire) {
      signatureHtml = `
        <div class="signature">
          <div>${signataire.Grade || ''}</div>
          <div>${signataire.Prenom || ''} ${signataire.Nom || ''}</div>
          <div>${signataire.Fonction || ''}</div>
          ${signataire.TitreHonorifique ? `<div><em>${signataire.TitreHonorifique}</em></div>` : ''}
        </div>
      `;
    } else {
      signatureHtml = `
        <div class="signature">
          <div>${expediteur}</div>
        </div>
      `;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>

<style>
  @page {
    size: A4 ${orientation};
    margin: 20mm;
  }

  body {
    font-family: "Times New Roman", serif;
    margin: 0;
    padding: 0;
    color: black;
    font-size: 12pt;
  }

  /* HEADER */
  .header {
    display: grid;
    grid-template-columns: 1fr 120px 1fr;
    align-items: start;
    margin-bottom: 30px;
    padding-bottom: 10px;
    border-bottom: 1px solid #000;
  }

  .left { text-align: left; line-height: 1.4; }
  .center { text-align: center; }
  .right { text-align: right; line-height: 1.4; }

  .logo { height: 70px; }

  .ref { margin-top: 10px; }

  /* CONTENU PRINCIPAL */
  .main-content {
    margin-top: 30px;
  }

  /* SIGNATURE */
  .signature {
    text-align: right;
    margin-top: 50px;
    line-height: 1.6;
    padding-top: 20px;
  }

  /* TABLE */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    font-size: 11pt;
  }

  th, td {
    border: 1px solid black;
    padding: 8px;
  }

  th {
    background-color: #f0f0f0;
    font-weight: bold;
  }

  tr {
    page-break-inside: avoid;
  }

  /* FOOTER */
  .footer {
    text-align: center;
    font-size: 9pt;
    margin-top: 40px;
    padding-top: 10px;
    border-top: 1px solid #ccc;
  }
</style>
</head>

<body>
  <div class="header">
    <div class="left">
      <div><strong>${ministere}</strong></div>
      <div>${cabinet}</div>
      <div><strong>${service}</strong></div>
      <div class="ref">${reference}</div>
    </div>
    <div class="center">
      ${logo ? `<img src="${logo}" class="logo" />` : ''}
    </div>
    <div class="right">
      <div><strong>${pays}</strong></div>
      <div><em>${devise}</em></div>
    </div>
  </div>

  ${signatureHtml}
  
  <div class="main-content">
    ${content}
  </div>

  <div class="footer">
    Document généré le ${dayjs().format('DD/MM/YYYY à HH:mm')}
  </div>
</body>
</html>
    `;

    // Sauvegarder le contenu original

    // Ouvrir une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  return { printDocument };
};