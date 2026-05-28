import { useState } from 'react';
import {
  Table, Button, Modal, TextInput, Stack, Card, Group,
  ActionIcon, Text, Badge, Divider, ScrollArea, 
  Pagination, Textarea, FileButton, Avatar, Alert
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconEdit, IconSearch, IconPhoto, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { ParametreGeneral } from './types';

interface ParametresTabProps {
  parametres: ParametreGeneral[];
  onRefresh: () => void;
}

export function ParametresTab({ parametres, onRefresh }: ParametresTabProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ParametreGeneral | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ParametreGeneral | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [, setLogoBase64] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const itemsPerPage = 10;

  const form = useForm({
    initialValues: { Code: '', Valeur: '', Description: '' },
    validate: {
      Code: (value) => (value ? null : 'Le code est requis'),
      Valeur: (value) => (value ? null : 'La valeur est requise'),
    }
  });

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      notifications.show({ 
        title: 'Erreur', 
        message: 'Le logo ne doit pas dépasser 2 Mo', 
        color: 'red' 
      });
      return;
    }
    
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      notifications.show({ 
        title: 'Erreur', 
        message: 'Format non supporté. Utilisez PNG, JPEG, JPG, GIF ou WEBP', 
        color: 'red' 
      });
      return;
    }
    
    try {
      const base64 = await convertToBase64(file);
      setLogoBase64(base64);
      setLogoPreview(URL.createObjectURL(file));
      setShowPreview(true);
      
      await invoke('update_parametre_general', { code: 'LOGO_PATH', valeur: base64 });
      notifications.show({ 
        title: 'Succès', 
        message: 'Logo téléchargé avec succès', 
        color: 'green' 
      });
      onRefresh();
    } catch (error) {
      notifications.show({ 
        title: 'Erreur', 
        message: 'Impossible de charger le logo', 
        color: 'red' 
      });
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await invoke('update_parametre_general', { code: 'LOGO_PATH', valeur: '' });
      setLogoPreview(null);
      setLogoBase64('');
      setShowPreview(false);
      notifications.show({ 
        title: 'Succès', 
        message: 'Logo supprimé', 
        color: 'green' 
      });
      onRefresh();
    } catch (error) {
      notifications.show({ 
        title: 'Erreur', 
        message: 'Impossible de supprimer le logo', 
        color: 'red' 
      });
    }
  };

  const handleSave = async (values: typeof form.values) => {
    try {
      if (editingItem) {
        await invoke('update_parametre_general', { code: values.Code, valeur: values.Valeur });
        notifications.show({ 
          title: 'Succès', 
          message: `Paramètre "${values.Code}" modifié avec succès`, 
          color: 'green' 
        });
      } else {
        await invoke('create_parametre_general', { 
          code: values.Code, 
          valeur: values.Valeur, 
          description: values.Description 
        });
        notifications.show({ 
          title: 'Succès', 
          message: `Paramètre "${values.Code}" créé avec succès`, 
          color: 'green' 
        });
      }
      setModalOpen(false);
      form.reset();
      setEditingItem(null);
      onRefresh();
    } catch (error) {
      notifications.show({ 
        title: 'Erreur', 
        message: `Erreur: ${error}`, 
        color: 'red' 
      });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await invoke('delete_parametre_general', { code: itemToDelete.Code });
      notifications.show({ 
        title: 'Succès', 
        message: `Paramètre "${itemToDelete.Code}" supprimé avec succès`, 
        color: 'green' 
      });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      onRefresh();
    } catch (error) {
      notifications.show({ 
        title: 'Erreur', 
        message: `Impossible de supprimer le paramètre: ${error}`, 
        color: 'red' 
      });
    }
  };

  const filteredData = parametres.filter(p => 
    p.Code.toLowerCase().includes(search.toLowerCase()) ||
    p.Valeur.toLowerCase().includes(search.toLowerCase())
  );
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const currentLogo = parametres.find(p => p.Code === 'LOGO_PATH')?.Valeur || '';

  return (
    <Stack gap="md">
      {/* Section Logo */}
      <Card withBorder p="md" bg="#f8f9fa">
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs">
            <Text fw={600} size="sm">Logo de l'application</Text>
            <Text size="xs" c="dimmed">Format PNG, JPEG, JPG, GIF, WEBP - Max 2 Mo</Text>
            <Group gap="sm">
              <FileButton onChange={handleLogoUpload} accept="image/png,image/jpeg,image/jpg,image/gif,image/webp">
                {(props) => (
                  <Button {...props} size="xs" leftSection={<IconPhoto size={14} />} variant="light">
                    Choisir un logo
                  </Button>
                )}
              </FileButton>
              {currentLogo && (
                <Button size="xs" leftSection={<IconTrash size={14} />} color="red" variant="light" onClick={handleRemoveLogo}>
                  Supprimer le logo
                </Button>
              )}
            </Group>
            {logoPreview && showPreview && (
              <div style={{ marginTop: 10 }}>
                <Text size="xs" c="dimmed">Nouveau logo:</Text>
                <img src={logoPreview} alt="Aperçu logo" style={{ maxHeight: 50, marginTop: 5 }} />
              </div>
            )}
          </Stack>
          {currentLogo ? (
            <Avatar size={80} radius="md" src={currentLogo} />
          ) : (
            <Avatar size={80} radius="md" color="gray">
              <IconPhoto size={40} />
            </Avatar>
          )}
        </Group>
      </Card>

      <Divider label="Paramètres" labelPosition="center" />

      <Group justify="space-between">
        <TextInput
          placeholder="Rechercher un paramètre..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
          style={{ width: 300 }}
        />
        <Button leftSection={<IconPlus size={16} />} onClick={() => { setEditingItem(null); form.reset(); setModalOpen(true); }} variant="gradient" gradient={{ from: '#1b365d', to: '#2a4a7a' }}>
          Nouveau paramètre
        </Button>
      </Group>

      <Divider />

      <Card withBorder p="0">
        <ScrollArea style={{ maxHeight: 500 }}>
          <Table striped highlightOnHover>
            <Table.Thead style={{ backgroundColor: '#1b365d' }}>
              <Table.Tr>
                <Table.Th style={{ color: 'white', width: 150 }}>Code</Table.Th>
                <Table.Th style={{ color: 'white' }}>Valeur</Table.Th>
                <Table.Th style={{ color: 'white' }}>Description</Table.Th>
                <Table.Th style={{ color: 'white', width: 120, textAlign: 'center' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedData.filter(p => p.Code !== 'LOGO_PATH').map((p) => (
                <Table.Tr key={p.ParametreID}>
                  <Table.Td>
                    <Badge variant="light" color="blue">
                      {p.Code}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500} lineClamp={2}>{p.Valeur}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{p.Description || '-'}</Text>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Group gap="xs" justify="center">
                      <ActionIcon 
                        onClick={() => { 
                          setEditingItem(p); 
                          form.setValues({ 
                            Code: p.Code, 
                            Valeur: p.Valeur, 
                            Description: p.Description || '' 
                          }); 
                          setModalOpen(true); 
                        }} 
                        color="orange" 
                        variant="light"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        onClick={() => { 
                          setItemToDelete(p); 
                          setDeleteModalOpen(true); 
                        }} 
                        color="red" 
                        variant="light"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      {totalPages > 1 && (
        <Group justify="center">
          <Pagination total={totalPages} value={page} onChange={setPage} color="blue" />
        </Group>
      )}

      {/* Modal Création/Modification */}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? "Modifier le paramètre" : "Nouveau paramètre"} size="md" centered>
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack>
            <TextInput 
              label="Code" 
              placeholder="Ex: MA_VARIABLE" 
              {...form.getInputProps('Code')} 
              required 
              disabled={!!editingItem} 
            />
            <TextInput 
              label="Valeur" 
              placeholder="Valeur du paramètre" 
              {...form.getInputProps('Valeur')} 
              required 
            />
            <Textarea 
              label="Description" 
              placeholder="Description du paramètre" 
              {...form.getInputProps('Description')} 
              rows={3} 
            />
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit" color="blue">{editingItem ? 'Modifier' : 'Créer'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Confirmation Suppression */}
      <Modal opened={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirmation" size="sm" centered>
        <Stack>
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />}>
            Êtes-vous sûr de vouloir supprimer ce paramètre ?
          </Alert>
          <Text size="sm" c="dimmed" ta="center">
            Paramètre: <strong>{itemToDelete?.Code}</strong>
          </Text>
          <Text size="xs" c="dimmed" ta="center">
            Valeur actuelle: <strong>{itemToDelete?.Valeur}</strong>
          </Text>
          <Group justify="space-between">
            <Button variant="light" onClick={() => setDeleteModalOpen(false)}>Annuler</Button>
            <Button color="red" onClick={handleDelete}>Supprimer</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}