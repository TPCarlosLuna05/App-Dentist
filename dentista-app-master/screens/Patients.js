import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default  function Patients() {
  const navigation = useNavigation();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      checkUserRole();
      fetchPatients();
    }, [])
  );

  const checkUserRole = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setIsAdmin(user.rol === 'admin' || user.is_admin === 1);
      }
    } catch (error) {
      console.error('Error verificando rol de usuario:', error);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient => 
        patient.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.apellidos.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPatients(filtered);
    }
  }, [searchQuery, patients]);

  const fetchPatients = () => {
    setLoading(true);
    console.log('Intentando obtener pacientes de la API...');
    
    axios.get('https://dentist-app-0fcf42a43c96.herokuapp.com/api/pacientes')
      .then(response => {
        console.log('Respuesta recibida:', JSON.stringify(response.data, null, 2));
        
        let receivedPatients = [];
        
        // Verificar el formato de la respuesta y manejarla adecuadamente
        if (Array.isArray(response.data)) {
          // La respuesta es directamente un array de pacientes
          receivedPatients = response.data;
          console.log(`Se cargaron ${receivedPatients.length} pacientes correctamente`);
        } else if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
          // La respuesta tiene el formato {status: 'success', data: [...]}
          receivedPatients = response.data.data;
          console.log(`Se cargaron ${receivedPatients.length} pacientes correctamente`);
        } else {
          console.error('Formato de respuesta inesperado:', response.data);
          Alert.alert('Error', 'Los datos recibidos no tienen el formato esperado.');
          setLoading(false);
          return;
        }
        
        // Procesar los datos de los pacientes para asegurar consistencia
        const processedPatients = receivedPatients.map(patient => {
          // Hacer una copia del paciente para no mutar el original
          const processedPatient = { ...patient };
          
          // Asegurarse de que la edad sea un número si es posible
          if (processedPatient.edad !== undefined && processedPatient.edad !== null) {
            const edadNum = parseInt(processedPatient.edad, 10);
            if (!isNaN(edadNum)) {
              processedPatient.edad = edadNum;
            }
          }
          
          return processedPatient;
        });
        
        console.log(`Procesados ${processedPatients.length} pacientes con datos normalizados`);
        setPatients(processedPatients);
        setFilteredPatients(processedPatients);
        setLoading(false);
      })
      .catch(error => {
        const errorDetails = {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        };
        console.error('Error detallado al cargar pacientes:', JSON.stringify(errorDetails, null, 2));
        
        let errorMessage = 'Hubo un problema al conectar con el servidor.';
        
        if (error.response) {
          errorMessage += ` Código: ${error.response.status}`;
          if (error.response.data && error.response.data.message) {
            errorMessage += `. ${error.response.data.message}`;
          }
          
          if (error.response.status === 401) {
            errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
            Alert.alert('Sesión expirada', errorMessage, [
              { text: 'OK', onPress: () => navigation.replace('Login') }
            ]);
            return;
          }
        } else if (error.request) {
          errorMessage += ' No se recibió respuesta del servidor. Verifica tu conexión a internet.';
        } else {
          errorMessage += ` Detalle: ${error.message}`;
        }
        
        Alert.alert('Error', errorMessage);
        setLoading(false);
      });
  };

  const deletePatient = (id) => {
    Alert.alert(
      'Confirmar Eliminación',
      '¿Estás seguro que deseas eliminar este paciente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              // Primero verificamos si el paciente tiene citas asociadas
              const citasResponse = await axios.get('https://dentist-app-0fcf42a43c96.herokuapp.com/api/citas', {
                params: {
                  paciente_id: id
                }
              });
              
              // Verificamos si hay citas asociadas a este paciente específico
              const citasDelPaciente = citasResponse.data.filter(cita => cita.paciente_id === id);
              
              if (citasDelPaciente && citasDelPaciente.length > 0) {
                const citasPendientes = citasDelPaciente.filter(cita => cita.estado !== 'cancelada' && cita.estado !== 'completada').length;
                const citasCompletadas = citasDelPaciente.filter(cita => cita.estado === 'completada').length;
                
                let mensaje = 'Este paciente no puede ser eliminado porque tiene citas asociadas:\n\n';
                if (citasPendientes > 0) {
                  mensaje += `• ${citasPendientes} cita(s) pendiente(s)\n`;
                }
                if (citasCompletadas > 0) {
                  mensaje += `• ${citasCompletadas} cita(s) completada(s)\n`;
                }
                mensaje += '\nPor favor, asegúrese de que el paciente no tenga citas antes de eliminarlo.';
                
                Alert.alert(
                  'No se puede eliminar',
                  mensaje,
                  [{ text: 'Entendido' }]
                );
                setLoading(false);
                return;
              }

              // Si no tiene citas, procedemos con la eliminación
              const response = await axios.delete(`https://dentist-app-0fcf42a43c96.herokuapp.com/api/pacientes/${id}`);
              
              console.log('Respuesta de eliminación:', response);
              
              if (response.data && response.data.status === 'success') {
                setPatients(patients.filter(patient => patient.id !== id));
                console.log(`Paciente con ID ${id} eliminado correctamente`);
                Alert.alert('Éxito', 'Paciente eliminado correctamente.');
              } else if (response.status >= 200 && response.status < 300) {
                setPatients(patients.filter(patient => patient.id !== id));
                console.log(`Paciente con ID ${id} eliminado correctamente (respuesta HTTP: ${response.status})`);
                Alert.alert('Éxito', 'Paciente eliminado correctamente.');
              } else {
                console.error('Error al eliminar (formato inesperado):', response.data);
                Alert.alert('Error', `No se pudo eliminar el paciente. Respuesta: ${JSON.stringify(response.data)}`);
              }
              setLoading(false);
            } catch (error) {
              console.error('Error al eliminar paciente:', error);
              let errorMessage = 'Hubo un problema al conectar con el servidor.';
              
              if (error.response) {
                if (error.response.status === 404) {
                  errorMessage = 'El paciente no existe o ya ha sido eliminado.';
                } else if (error.response.status === 403) {
                  errorMessage = 'No tienes permisos para eliminar este paciente.';
                } else if (error.response.status === 401) {
                  errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
                  Alert.alert('Sesión expirada', errorMessage, [
                    { text: 'OK', onPress: () => navigation.replace('Login') }
                  ]);
                  return;
                } else if (error.response.status === 422) {
                  errorMessage = 'Error de validación. No se puede eliminar este paciente.';
                } else if (error.response.status === 500) {
                  errorMessage = 'Error interno del servidor. Inténtalo más tarde.';
                }
                
                if (error.response.data && typeof error.response.data === 'object') {
                  if (error.response.data.message) {
                    errorMessage += ` Detalle: ${error.response.data.message}`;
                  } else if (error.response.data.error) {
                    errorMessage += ` Detalle: ${error.response.data.error}`;
                  }
                }
              } else if (error.request) {
                errorMessage = 'No se recibió respuesta del servidor. Verifica tu conexión a internet.';
              } else {
                errorMessage += ` Detalle: ${error.message}`;
              }
              
              Alert.alert('Error', errorMessage);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleAddPatient = () => {
    navigation.navigate('PatientForm');
  };

  const handleEditPatient = (patient) => {
    navigation.navigate('PatientForm', { patient });
  };

  const handleViewHistory = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      navigation.navigate('PatientDetails', { patient });
    } else {
      Alert.alert('Error', 'No se encontraron datos del paciente');
    }
  };

  const renderPatientItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.patientCard}
      onPress={() => handleViewHistory(item.id)}
    >
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>
          {item.nombre} {item.apellidos}
        </Text>
        <Text style={styles.patientDetail}>
          <Text style={styles.labelText}>Teléfono:</Text> {item.telefono || 'N/A'}
        </Text>
        <Text style={styles.patientDetail}>
          <Text style={styles.labelText}>Email:</Text> {item.correo || item.email || 'N/A'}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.historyButton]} 
          onPress={() => handleViewHistory(item.id)}
        >
          <Ionicons name="eye-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => handleEditPatient(item)}
        >
          <Ionicons name="create-outline" size={22} color="#fff" />
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={() => deletePatient(item.id)}
          >
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

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
          <Text style={styles.headerTitle}>Pacientes</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddPatient}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar pacientes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#21588E" />
        </View>
      ) : (
        <>
          {filteredPatients.length > 0 ? (
            <FlatList
              data={filteredPatients}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderPatientItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={60} color="#cccccc" />
              <Text style={styles.emptyText}>
                No se encontraron pacientes
              </Text>
              {searchQuery ? (
                <Text style={styles.emptySubText}>
                  Intenta con otra búsqueda
                </Text>
              ) : null}
            </View>
          )}
        </>
      )}

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={handleAddPatient}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    borderRadius: 15,
    marginHorizontal: 20,
    marginTop: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#333',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 90,
  },
  patientCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    marginVertical: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#21588E',
    marginBottom: 5,
  },
  patientDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  labelText: {
    fontWeight: '500',
    color: '#444',
  },
  actionButtons: {
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 3,
  },
  historyButton: {
    backgroundColor: '#2FA0AD',
  },
  editButton: {
    backgroundColor: '#378DD0',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#21588E',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 15,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
});
