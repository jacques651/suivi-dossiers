// src/hooks/usePrint.ts
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import dayjs from 'dayjs';

interface ParametreGeneral {
  Code: string;
  Valeur: string;
}

type Orientation = 'portrait' | 'landscape';

interface UsePrintReturn {
  printDocument: (content: string, title: string, orientation?: Orientation, showHeader?: boolean, signataire?: SignataireData, destinataire?: DestinataireData, config?: PrintConfig) => void;
  printElement: (element: HTMLElement, title: string, orientation?: Orientation, showHeader?: boolean, signataire?: SignataireData, destinataire?: DestinataireData, config?: PrintConfig) => void;
  isLoading: boolean;
}

interface SignataireData {
  Nom: string;
  Prenom: string;
  Grade: string;
  Fonction: string;
  TitreHonorifique: string;
}

interface DestinataireData {
  Nom: string;
  Fonction?: string;
}

interface PrintConfig {
  numeroReference?: string;
  showFonctionDestinataire?: boolean;
  effectif?: number;
}

export const usePrint = (): UsePrintReturn => {
  const [params, setParams] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [signatairesDefauts, setSignatairesDefauts] = useState<any[]>([]);

  useEffect(() => {
    const loadParams = async () => {
      try {
        const result = await invoke('get_parametres_generaux');
        const data = result as ParametreGeneral[];
        const paramsMap: Record<string, string> = {};
        data.forEach(p => { paramsMap[p.Code] = p.Valeur; });
        setParams(paramsMap);

        const signatairesResult = await invoke('get_signataires_actifs');
        setSignatairesDefauts(signatairesResult as any[]);
      } catch (error) {
        console.error('Erreur chargement paramètres:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadParams();
  }, []);

  const getReferenceNumber = (customRef?: string): string => {
    if (customRef) {
      return customRef.replace('{YEAR}', dayjs().format('YYYY'));
    }
    const referenceParDefaut = params.REFERENCE || 'N°{YEAR}/M/SECU/CAB/ITS/CONF';
    return referenceParDefaut.replace('{YEAR}', dayjs().format('YYYY'));
  };

  const buildHtml = (
    content: string,
    title: string,
    orientation: Orientation,
    showHeader: boolean = true,
    signataire?: SignataireData,
    destinataire?: DestinataireData,
    config?: PrintConfig
  ) => {
    if (!showHeader) {
      return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${title}</title>
<style>
  @page { size: A4 ${orientation}; margin: 1.5cm; }
  body { font-family: 'Times New Roman', Arial, sans-serif; padding: 0; margin: 0; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1b365d; color: white; padding: 10px; border: 1px solid #2a4a7a; }
  td { padding: 8px; border: 1px solid #ddd; }
  @media print { th { background: #1b365d !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>${content}</body></html>`;
    }

    const logo = params.LOGO_PATH || '';
    const ministere = params.MINISTERE || 'MINISTERE DE LA SECURITE';
    const cabinet = params.CABINET || 'CABINET';
    const service = params.SERVICE || 'INSPECTION TECHNIQUE DES SERVICES';
    const reference = getReferenceNumber(config?.numeroReference);
    const pays = params.PAYS || 'BURKINA FASO';
    const devise = params.DEVISE || 'La Patrie ou la Mort, nous vaincrons';
    const expediteur = params.EXPEDITEUR || "L'Inspecteur Général des Services";

    const destinataireNom = destinataire?.Nom || params.DESTINATAIRE || 'Monsieur le Ministre de la Sécurité';
    const destinataireFonction = destinataire?.Fonction || '';

    let signataireData = signataire;
    if (!signataireData && signatairesDefauts.length > 0) {
      const defaultSign = signatairesDefauts[0];
      signataireData = {
        Nom: defaultSign.Nom,
        Prenom: defaultSign.Prenom,
        Grade: defaultSign.Grade || '',
        Fonction: defaultSign.Fonction || '',
        TitreHonorifique: defaultSign.TitreHonorifique || ''
      };
    }

    const signataireNom = signataireData?.Nom || '';
    const signatairePrenom = signataireData?.Prenom || '';
    const signataireGrade = signataireData?.Grade || '';
    const signataireFonction = signataireData?.Fonction || '';
    const signataireTitre = signataireData?.TitreHonorifique || '';

    const nomCompletSignataire = `${signatairePrenom} ${signataireNom}`.trim().toLowerCase();
    const estLeMemeQueSignataire = destinataireNom.toLowerCase().includes(nomCompletSignataire) ||
      nomCompletSignataire.includes(destinataireNom.toLowerCase());

    const afficherFonctionDestinataire = config?.showFonctionDestinataire !== undefined
      ? config.showFonctionDestinataire
      : (!estLeMemeQueSignataire && destinataireFonction !== '');

    const fonctionsAMasquer = ["L'Inspecteur Général des Services", "Inspecteur Général des Services"];
    const afficherFonctionSignataire = signataireFonction && !fonctionsAMasquer.includes(signataireFonction);

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page {
    size: A4 ${orientation};
    margin: 1cm;
    @top-center { content: none; }
    @bottom-center { content: none; }
    @top-left { content: none; }
    @top-right { content: none; }
    @bottom-left { content: none; }
    @bottom-right { content: none; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    background: white;
    font-size: 12pt;
    line-height: 1.2;
    margin: 0;
    padding: 0;
  }
  @media print {
    html, body { margin: 0; padding: 0; }
    body { margin: 0; padding: 0; }
    tr { page-break-inside: avoid; }
  }
 .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 5px;
    padding-bottom: 3px;
}
  .header-left {
    text-align: center;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .header-left .title { 
    font-size: 11pt; 
    font-weight: bold; 
    text-transform: uppercase;
    margin: 2px 0;
  }
  .header-left .separator { 
    width: 50px; 
    height: 1px; 
    background: #000; 
    margin: 4px auto; 
  }
  .header-left .cabinet {
    font-size: 11pt;
    font-weight: normal;
    text-transform: uppercase;
    margin: 2px 0;
  }
  .header-left .service {
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 2px 0;
  }
  .header-left .reference { 
    font-size: 9pt; 
    margin-top: 8px;
  }
  .header-center {
    text-align: center;
    flex: 0 0 auto;
    padding: 0 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .logo { height: 65px; max-width: 85px; object-fit: contain; }
  .header-right {
    text-align: center;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .country { 
    font-size: 11pt; 
    font-weight: bold; 
    text-transform: uppercase; 
    margin: 2px 0;
  }
 .motto {
    font-size: 9pt;
    font-style: italic;
    margin: 2px 0 10px 0;
}
  .destinataire-block {
    margin-top: 15px;
    text-align: center;
    line-height: 1.1;
  }
  .destinataire-block .expediteur {
    margin: 1px 0;
}

.destinataire-block .a {
    margin: 1px 0;
}

.destinataire-block .destinataire-nom {
    margin: 1px 0;
}
  .destinataire-block .destinataire-fonction {
    font-size: 9pt;
    font-style: italic;
    margin-top: 4px;
    color: #555;
  }
  .objet {
    margin: 20px 0;
}
  .objet-label {
    font-size: 11pt;
    font-weight: 700;
    text-decoration: underline;
  }
  .objet-texte {
    font-size: 11pt;
    margin-left: 5px;
  }
table {
    width: 100%;
    border-collapse: collapse;
    margin: 2px 0 10px 0;
    font-size: 9pt;
}
  th, td {
    border: 1px solid #000;
    padding: 4px 6px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f0f0f0;
    font-weight: 700;
    text-align: center;
  }
  tr:nth-child(even) { background: #fafafa; }
  .signature {
    text-align: right;
    margin-top: 25px;
    line-height: 1.2;
    width: 40%;
    margin-left: auto;
}

.signature-space {
    height: 80px;
}
  .signature-fonction {
    font-size: 10pt;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .signature-nom {
    font-size: 11pt;
    font-weight: 700;
    text-decoration: underline;
    margin-top: 5px;
  }
  .signature-grade {
    font-size: 10pt;
    margin-top: 3px;
  }
  .signature-titre {
    font-size: 9pt;
    font-style: italic;
    margin-top: 3px;
  }
  .signature-line {
    width: 160px;
    height: 1px;
    background: #000;
    margin-top: 20px;
    margin-left: auto;
  }
  .signature-date {
    font-size: 9pt;
    margin-top: 5px;
  }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <div class="title">${ministere}</div>
    <div class="separator"></div>
    <div class="cabinet">${cabinet}</div>
    <div class="separator"></div>
    <div class="service">${service}</div>
    <div class="separator"></div>
    <div class="reference">${reference}</div>
  </div>
  <div class="header-center">
    ${logo ? `<img src="${logo}" class="logo" onerror="this.style.display='none'" />` : '<div style="font-size: 10pt; color: #999;">[Armoiries]</div>'}
  </div>
  <div class="header-right">
    <div class="country">${pays}</div>
    <div class="motto">${devise}</div>
    <div class="destinataire-block">
      <div class="expediteur">${expediteur}</div>
      <div class="a">A</div>
      <div class="destinataire-nom">${destinataireNom}</div>
      ${afficherFonctionDestinataire && destinataireFonction ? `<div class="destinataire-fonction">${destinataireFonction}</div>` : ''}
    </div>
  </div>
</div>
${content}
<div class="signature">
  ${afficherFonctionSignataire ? `<div class="signature-fonction">${signataireFonction}</div>` : ''}

  <div class="signature-date">
      Fait à Ouagadougou, le ${dayjs().format('DD/MM/YYYY')}
  </div>

  <div class="signature-space"></div>

  <div class="signature-nom">
      ${signatairePrenom} ${signataireNom}
  </div>

  ${signataireGrade ? `<div class="signature-grade">${signataireGrade}</div>` : ''}
  ${signataireTitre ? `<div class="signature-titre">${signataireTitre}</div>` : ''}
</div>
</body>
</html>`;
  };

  const printDocument = (
    content: string,
    title: string,
    orientation: Orientation = 'portrait',
    showHeader: boolean = true,
    signataire?: SignataireData,
    destinataire?: DestinataireData,
    config?: PrintConfig
  ) => {
    const html = buildHtml(content, title, orientation, showHeader, signataire, destinataire, config);

    // Supprimer l'ancien iframe s'il existe
    const oldIframe = document.getElementById('print-iframe');
    if (oldIframe) {
      oldIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            iframe.remove();
          }
        }, 1000);
      }, 500);
    }
  };

  const printElement = (
    element: HTMLElement,
    title: string,
    orientation: Orientation = 'landscape',
    showHeader: boolean = true,
    signataire?: SignataireData,
    destinataire?: DestinataireData,
    config?: PrintConfig
  ) => {
    const content = element.outerHTML;
    printDocument(content, title, orientation, showHeader, signataire, destinataire, config);
  };

  return { printDocument, printElement, isLoading };
};