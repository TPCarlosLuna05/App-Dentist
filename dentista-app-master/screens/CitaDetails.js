import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

export default function CitaDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { citaId } = route.params || {};

  const [cita, setCita] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCitaDetails();
  }, [citaId]);

  // Obtener detalles de la cita desde el API
  const fetchCitaDetails = async () => {
    if (!citaId) {
      Alert.alert('Error', 'No se proporcionó un ID de cita válido');
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/citas/${citaId}`);
      
      console.log('Respuesta detalle cita:', response);
      
      // Simulación de respuesta con formato estandarizado para propósitos de depuración
      console.log('LOG  Respuesta de cita detalle: {"data": {"created_at": "2025-05-06T09:36:47.000000Z", "descripcion_manual": "Pues es una descripcion vea y pus ajam", "doctor": {"id": 1, "nombre": "Dr. Adrian Amaro"}, "estado": "pendiente", "fecha": "2025-05-17T00:00:00.000000Z", "hora": "08:31", "id": 2, "id_doctor": 1, "id_paciente": 5, "id_procedimiento": 3, "observaciones": "Pus ahi esta. vea nomas", "paciente": {"id": 5, "nombre": "Juan", "apellidos": "Perez"}, "procedimiento": {"id": 3, "nombre": "Limpieza dental"}, "updated_at": "2025-05-06T09:36:47.000000Z"}, "message": "Detalle de cita recuperado exitosamente", "success": true}');
      
      if (response.success && response.data) {
        setCita(response.data);
      } else {
        console.error('Error en la respuesta:', response);
        Alert.alert('Error', 'No se pudo cargar la información de la cita');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error obteniendo detalles de la cita:', error);
      Alert.alert('Error', 'Hubo un problema al cargar los datos de la cita');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Función para editar la cita actual
  const handleEditCita = () => {
    navigation.navigate('CitaForm', { cita, isEditing: true });
  };

  // Función para eliminar la cita actual
  const handleDeleteCita = () => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar esta cita?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.delete(`/citas/${citaId}`);
              console.log('Respuesta de eliminación:', response);
              
              if (response.success) {
                Alert.alert('Éxito', 'Cita eliminada correctamente', [
                  { text: 'OK', onPress: () => navigation.navigate('ConsultasScreen') }
                ]);
              } else {
                console.error('Error al eliminar cita:', response);
                Alert.alert('Error', response.message || 'No se pudo eliminar la cita');
                setLoading(false);
              }
            } catch (error) {
              console.error('Error al eliminar cita:', error);
              Alert.alert('Error', 'Ocurrió un problema al eliminar la cita');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Función para cambiar el estado de la cita
  const handleChangeStatus = (newStatus) => {
    Alert.alert(
      'Cambiar estado',
      `¿Estás seguro de que deseas cambiar el estado a "${newStatus}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cambiar', 
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.put(`/citas/${citaId}`, {
                ...cita,
                estado: newStatus
              });
              
              console.log('Respuesta actualización estado:', response);
              
              if (response.success) {
                Alert.alert('Éxito', response.message || 'Estado actualizado correctamente');
                fetchCitaDetails(); // Recargar los datos
              } else {
                console.error('Error al actualizar estado:', response);
                Alert.alert('Error', response.message || 'No se pudo actualizar el estado');
              }
              setLoading(false);
            } catch (error) {
              console.error('Error al actualizar estado:', error);
              Alert.alert('Error', 'Ocurrió un problema al actualizar el estado');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Función para obtener el color según el estado
  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return '#FF9800'; // Naranja
      case 'completada': return '#4CAF50'; // Verde
      case 'cancelada': return '#F44336'; // Rojo
      default: return '#757575'; // Gris
    }
  };

  // Función para formatear la fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  // Función para formatear la hora
  const formatTime = (timeString) => {
    if (!timeString) return 'No especificada';
    
    // Si la hora viene en formato HH:MM:SS
    if (typeof timeString === 'string' && timeString.includes(':')) {
      return timeString.substring(0, 5); // Devuelve solo HH:MM
    }
    
    // Si es un string de fecha ISO completo
    return new Date(timeString).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#21588E" />
        <Text style={styles.loadingText}>Cargando detalles de la cita...</Text>
      </View>
    );
  }

  if (!cita) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>No se encontró información de la cita</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#21588E', '#2FA0AD']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalles de la Cita</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={handleEditCita}
          >
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.contentContainer}>
        {/* Estado de la cita */}
        <View style={styles.estadoContainer}>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(cita.estado) }]}>
            <Text style={styles.estadoText}>{cita.estado || 'Pendiente'}</Text>
          </View>
        </View>

        {/* Fecha y hora */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="calendar" size={24} color="#21588E" />
            <Text style={styles.infoHeaderText}>Fecha y Hora</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha:</Text>
            <Text style={styles.infoValue}>{formatDate(cita.fecha)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hora:</Text>
            <Text style={styles.infoValue}>{formatTime(cita.hora)}</Text>
          </View>
        </View>

        {/* Información del paciente */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="person" size={24} color="#21588E" />
            <Text style={styles.infoHeaderText}>Paciente</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre:</Text>
            <Text style={styles.infoValue}>
              {cita.paciente ? `${cita.paciente.nombre} ${cita.paciente.apellidos || ''}` : 'No especificado'}
            </Text>
          </View>
          {cita.paciente && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Teléfono:</Text>
                <Text style={styles.infoValue}>{cita.paciente.telefono || 'No especificado'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{cita.paciente.correo || cita.paciente.email || 'No especificado'}</Text>
              </View>
            </>
          )}
        </View>

        {/* Información del doctor */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="medkit" size={24} color="#21588E" />
            <Text style={styles.infoHeaderText}>Doctor</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre:</Text>
            <Text style={styles.infoValue}>
              {cita.doctor ? cita.doctor.nombre : 'No especificado'}
            </Text>
          </View>
          {cita.doctor && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Especialidad:</Text>
                <Text style={styles.infoValue}>{cita.doctor.especialidad || 'No especificada'}</Text>
              </View>
            </>
          )}
        </View>

        {/* Información del procedimiento */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="clipboard" size={24} color="#21588E" />
            <Text style={styles.infoHeaderText}>Procedimiento</Text>
          </View>
          {cita.procedimiento ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre:</Text>
              <Text style={styles.infoValue}>{cita.procedimiento.nombre}</Text>
            </View>
          ) : (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Descripción:</Text>
              <Text style={styles.infoValue}>{cita.descripcion_manual || 'No especificado'}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Observaciones:</Text>
            <Text style={styles.infoValue}>{cita.observaciones || 'Sin observaciones'}</Text>
          </View>
        </View>

        {/* Acciones para cambiar estado */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Cambiar estado</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#FF9800' }]}
              onPress={() => handleChangeStatus('pendiente')}
              disabled={cita.estado === 'pendiente'}
            >
              <Text style={styles.statusButtonText}>Pendiente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleChangeStatus('completada')}
              disabled={cita.estado === 'completada'}
            >
              <Text style={styles.statusButtonText}>Completada</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#F44336' }]}
              onPress={() => handleChangeStatus('cancelada')}
              disabled={cita.estado === 'cancelada'}
            >
              <Text style={styles.statusButtonText}>Cancelada</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botón de eliminar */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteCita}
        >
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={styles.deleteButtonText}>Eliminar Cita</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerGradient: {
    height: 120,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  estadoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  estadoBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  estadoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
    marginBottom: 10,
  },
  infoHeaderText: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    width: '30%',
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },  statusButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 2,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  statusButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
});
