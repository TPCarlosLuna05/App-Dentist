import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

const { width: screenWidth } = Dimensions.get('window');

export default function PatientDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { patient: initialPatient } = route.params || {};
  const [patient, setPatient] = useState(initialPatient);
  const [historialMedico, setHistorialMedico] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const carouselRef = useRef(null);

  // Usar useFocusEffect para recargar los datos cuando la pantalla recibe el foco
  useFocusEffect(
    React.useCallback(() => {
      if (patient?.id) {
        fetchHistorialMedico(patient.id);
      }
    }, [patient?.id])
  );

  const fetchHistorialMedico = async (pacienteId) => {
    try {
      setLoadingHistorial(true);
      const response = await api.get(`/historial-por-paciente/${pacienteId}`);
      
      console.log('Respuesta del historial médico:', response.data);
      
      // Corrección: Acceder a response.data y luego a historial
      if (response.data && response.data.historial) {
        setHistorialMedico(response.data.historial);
        console.log(`Se encontraron ${response.data.historial.length} registros en el historial médico`);
      } else {
        console.log('No se encontró historial para el paciente');
        setHistorialMedico([]);
      }
    } catch (error) {
      console.error('Error al cargar el historial médico:', error);
      setHistorialMedico([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const renderHistorialItem = ({ item }) => {
    return (
      <View style={styles.historialCard}>
        <View style={styles.historialCardHeader}>
          <Ionicons name="calendar" size={22} color="#21588E" />
          <Text style={styles.historialDate}>{formatDate(item.fecha)}</Text>
        </View>

        <View style={styles.historialCardBody}>
          <View style={styles.historialDetailItem}>
            <Text style={styles.historialDetailLabel}>Procedimiento:</Text>
            <Text style={styles.historialDetailValue}>{item.procedimiento}</Text>
          </View>
          
          <View style={styles.historialDetailItem}>
            <Text style={styles.historialDetailLabel}>Doctor:</Text>
            <Text style={styles.historialDetailValue}>{item.doctor}</Text>
          </View>
          
          {item.notas && (
            <View style={styles.historialDetailItem}>
              <Text style={styles.historialDetailLabel}>Notas:</Text>
              <Text style={styles.historialDetailValue}>{item.notas}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Verificar si tenemos datos del paciente
  if (!patient) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>No se encontró información del paciente</Text>
        <TouchableOpacity
          style={styles.backToListButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backToListButtonText}>Volver a la lista</Text>
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
          <Text style={styles.headerTitle}>Detalles del Paciente</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('PatientForm', { patient })}
          >
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Sección de información personal */}
        <View style={styles.infoSection}>
          <View style={styles.patientProfileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {patient.nombre?.charAt(0) || ''}
                  {patient.apellidos?.charAt(0) || ''}
                </Text>
              </View>
            </View>
            <View style={styles.patientNameContainer}>
              <Text style={styles.patientName}>
                {patient.nombre} {patient.apellidos}
              </Text>
              <Text style={styles.patientId}>ID: {patient.id}</Text>
              <Text style={styles.registrationDate}>
                Fecha de registro: {patient.fecha_registro || 'No disponible'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Información de contacto */}
          <Text style={styles.sectionTitle}>Información de Contacto</Text>
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={20} color="#21588E" />
            <Text style={styles.infoLabel}>Teléfono:</Text>
            <Text style={styles.infoValue}>{patient.telefono || 'No disponible'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={20} color="#21588E" />
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{patient.correo || patient.email || 'No disponible'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="home-outline" size={20} color="#21588E" />
            <Text style={styles.infoLabel}>Dirección:</Text>
            <Text style={styles.infoValue}>{patient.direccion || 'No disponible'}</Text>
          </View>

          <View style={styles.divider} />

          {/* Sección de historial médico */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Historial Médico</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => navigation.navigate('HistorialMedicoScreen', { paciente: patient })}
            >
              <Text style={styles.seeAllText}>Ver todo</Text>
            </TouchableOpacity>
          </View>
          {loadingHistorial ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#21588E" />
              <Text style={styles.loadingText}>Cargando historial...</Text>
            </View>
          ) : historialMedico.length > 0 ? (
            <View style={styles.historialCarouselContainer}>
              <Text style={styles.carouselInstructions}>
                Historial médico del paciente
              </Text>
              
              <View style={styles.historialListContainer}>
                {historialMedico.map((item, index) => (
                  <View key={`historial-${index}`} style={styles.historialCard}>
                    <View style={styles.historialCardHeader}>
                      <Ionicons name="calendar" size={22} color="#21588E" />
                      <Text style={styles.historialDate}>{formatDate(item.fecha)}</Text>
                    </View>

                    <View style={styles.historialCardBody}>
                      <View style={styles.historialDetailItem}>
                        <Text style={styles.historialDetailLabel}>Procedimiento:</Text>
                        <Text style={styles.historialDetailValue}>{item.procedimiento}</Text>
                      </View>
                      
                      <View style={styles.historialDetailItem}>
                        <Text style={styles.historialDetailLabel}>Doctor:</Text>
                        <Text style={styles.historialDetailValue}>{item.doctor}</Text>
                      </View>
                      
                      {item.notas && (
                        <View style={styles.historialDetailItem}>
                          <Text style={styles.historialDetailLabel}>Notas:</Text>
                          <Text style={styles.historialDetailValue}>{item.notas}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
              
              <View style={styles.historialPaginationContainer}>
                <Text style={styles.historialPaginationText}>
                  {historialMedico.length} {historialMedico.length === 1 ? 'registro encontrado' : 'registros encontrados'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noHistorialContainer}>
              <Ionicons name="document-text-outline" size={40} color="#cccccc" />
              <Text style={styles.noHistorialText}>No hay historial médico disponible</Text>
              <Text style={styles.noHistorialSubText}>Una vez que se registren procedimientos, aparecerán aquí</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  backToListButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#21588E',
    borderRadius: 10,
  },
  backToListButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  patientProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#21588E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  patientNameContainer: {
    flex: 1,
  },
  patientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  patientId: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  registrationDate: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#21588E',
    marginBottom: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#444',
    marginLeft: 10,
    width: 80,
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
    flex: 1,
    flexWrap: 'wrap',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllButton: {
    padding: 5,
  },
  seeAllText: {
    color: '#2FA0AD',
    fontWeight: '500',
  },
  historialCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#21588E',
  },
  historialCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  historialDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  historialCardBody: {
    marginLeft: 34,
  },
  historialDetailItem: {
    marginBottom: 5,
  },
  historialDetailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  historialDetailValue: {
    fontSize: 14,
    color: '#555',
  },
  noHistorialText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  historialCarouselContainer: {
    marginTop: 10,
  },
  carouselInstructions: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 10,
  },
  historialPaginationContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  historialPaginationText: {
    fontSize: 14,
    color: '#666',
  },
  noHistorialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 20,
  },
  noHistorialSubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
    textAlign: 'center',
  },
  historialListContainer: {
    marginTop: 10,
  }
});
