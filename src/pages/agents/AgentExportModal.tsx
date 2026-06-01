// src/pages/agents/AgentExportModal.tsx
import { useState } from 'react';
import { Modal, Stack, Text, Group, Button, Divider, Alert } from '@mantine/core';
import { IconFileExcel, IconFile, IconFileWord, IconCheck, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Agent, Grade } from './AgentManager';

interface AgentExportModalProps {
  opened: boolean;
  onClose: () => void;
  agents: Agent[];
  grades: Grade[];
}

export default function AgentExportModal({ opened, onClose, agents, grades }: AgentExportModalProps) {
  const [exporting, setExporting] = useState(false);

  const getGrade = (id?: number) => grades.find(g => g.GradeID === id)?.LibelleGrade || '';

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const data = agents.map(a => ({
        Matricule: a.Matricule,
        Nom: a.Nom,
        Prénom: a.Prenom,
        Grade: getGrade(a.GradeID),
        Service: a.Service || '',
        Entité: a.Entite || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Agents');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const path = await save({
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: `agents_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`
      });
      if (path) {
        await writeFile(path, new Uint8Array(buf));
        notifications.show({ title: 'Succès', message: 'Export Excel réussi !', color: 'green', icon: <IconCheck size={16} /> });
        onClose();
      }
    } catch (error) {
      notifications.show({ title: 'Erreur', message: "Erreur lors de l'export Excel", color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      doc.setFillColor(27, 54, 93);
      doc.rect(0, 0, 297, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('LISTE DES AGENTS', 148.5, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Généré le : ${dayjs().format('DD/MM/YYYY HH:mm')}`, 148.5, 32, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.text(`Total agents : ${agents.length}`, 14, 50);

      const head = [['N°', 'Matricule', 'Nom', 'Prénom', 'Grade', 'Service', 'Entité']];
      const body = agents.map((agent, idx) => [
        (idx + 1).toString(),
        agent.Matricule,
        agent.Nom,
        agent.Prenom,
        getGrade(agent.GradeID),
        agent.Service || '',
        agent.Entite || ''
      ]);

      autoTable(doc, {
        head,
        body,
        startY: 60,
        theme: 'striped',
        headStyles: { fillColor: [27, 54, 93], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 }
      });

      const path = await save({
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: `agents_${dayjs().format('YYYY-MM-DD_HH-mm')}.pdf`
      });
      if (path) {
        await writeFile(path, new Uint8Array(doc.output('arraybuffer')));
        notifications.show({ title: 'Succès', message: 'Export PDF réussi !', color: 'green', icon: <IconCheck size={16} /> });
        onClose();
      }
    } catch (error) {
      notifications.show({ title: 'Erreur', message: "Erreur lors de l'export PDF", color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  const exportToWord = async () => {
    setExporting(true);
    try {
      const rows = agents.map((agent, idx) => `
        <tr>
          <td style="border:1px solid #ddd;padding:8px;text-align:center">${idx + 1}</td>
          <td style="border:1px solid #ddd;padding:8px">${agent.Matricule}</td>
          <td style="border:1px solid #ddd;padding:8px">${agent.Nom}</td>
          <td style="border:1px solid #ddd;padding:8px">${agent.Prenom}</td>
          <td style="border:1px solid #ddd;padding:8px">${getGrade(agent.GradeID)}</td>
          <td style="border:1px solid #ddd;padding:8px">${agent.Service || '-'}</td>
          <td style="border:1px solid #ddd;padding:8px">${agent.Entite || '-'}</td>
        </tr>
      `).join('');

      const htmlContent = `<!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Liste des agents</title>
      <style>
        body { font-family: 'Calibri', Arial, sans-serif; margin: 40px; }
        h1 { color: #1b365d; border-bottom: 3px solid #1b365d; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #1b365d; color: white; padding: 10px; border: 1px solid #ddd; }
        td { padding: 8px; border: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
      </head>
      <body>
        <h1>📋 LISTE DES AGENTS</h1>
        <p>Généré le ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        <p>Total agents : ${agents.length}</p>
        <table>
          <thead><tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Grade</th><th>Service</th><th>Entité</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>`;

      const path = await save({
        filters: [{ name: 'Word', extensions: ['doc'] }],
        defaultPath: `agents_${dayjs().format('YYYY-MM-DD_HH-mm')}.doc`
      });
      if (path) {
        await writeFile(path, new TextEncoder().encode(htmlContent));
        notifications.show({ title: 'Succès', message: 'Export Word réussi !', color: 'green', icon: <IconCheck size={16} /> });
        onClose();
      }
    } catch (error) {
      notifications.show({ title: 'Erreur', message: "Erreur lors de l'export Word", color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Exporter la liste des agents"
      size="md"
      centered
      styles={{
        header: { backgroundColor: '#1b365d' },
        title: { color: 'white', fontWeight: 600 },
      }}
    >
      <Stack gap="md">
        <Alert color="blue" variant="light">
          <Text size="sm">Vous allez exporter {agents.length} agent(s)</Text>
        </Alert>

        <Divider label="Format d'export" labelPosition="center" />

        <Group grow>
          <Button
            variant="light"
            color="green"
            leftSection={<IconFileExcel size={18} />}
            onClick={exportToExcel}
            loading={exporting}
          >
            Excel (.xlsx)
          </Button>
          <Button
            variant="light"
            color="red"
            leftSection={<IconFile size={18} />}
            onClick={exportToPDF}
            loading={exporting}
          >
            PDF (.pdf)
          </Button>
          <Button
            variant="light"
            color="blue"
            leftSection={<IconFileWord size={18} />}
            onClick={exportToWord}
            loading={exporting}
          >
            Word (.doc)
          </Button>
        </Group>

        <Divider />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>Annuler</Button>
        </Group>
      </Stack>
    </Modal>
  );
}