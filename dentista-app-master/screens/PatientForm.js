import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export default function PatientForm() {
  const navigation = useNavigation();
  const route = useRoute();
  const { patient, refresh } = route.params || {};
  const isEditing = !!patient;
  
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    direccion: '',
  });

  useFocusEffect(
    React.useCallback(() => {
      if (isEditing && patient) {
        setFormData({
          nombre: patient.nombre || '',
          apellidos: patient.apellidos || '',
          telefono: patient.telefono || '',
          email: patient.email || patient.correo || '',
          direccion: patient.direccion || '',
        });
      }
      
      // Verificar la conectividad inicial
      checkConnectivity();
      
      // Suscribirse a cambios de conectividad
      const unsubscribe = NetInfo.addEventListener(state => {
        setIsConnected(state.isConnected);
      });
      
      // Limpiar suscripción al desmontar
      return () => unsubscribe();
    }, [isEditing, patient])
  );
  
  // Función para verificar la conectividad
  const checkConnectivity = async () => {
    const connectionInfo = await NetInfo.fetch();
    setIsConnected(connectionInfo.isConnected);
  };

  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const validateForm = () => {
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return false;
    }
    if (!formData.apellidos.trim()) {
      Alert.alert('Error', 'Los apellidos son obligatorios');
      return false;
    }
    if (!formData.telefono.trim()) {
      Alert.alert('Error', 'El teléfono es obligatorio');
      return false;
    }
    
    if (formData.email.trim() && !formData.email.includes('@')) {
      Alert.alert('Error', 'El formato del email no es válido');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    const apiUrl = isEditing 
      ? `https://dentist-app-0fcf42a43c96.herokuapp.com/api/pacientes/${patient.id}`
      : 'https://dentist-app-0fcf42a43c96.herokuapp.com/api/pacientes';
    
    const method = isEditing ? 'put' : 'post';
    
    if (isEditing) {
      console.log(`Editando paciente con ID: ${patient.id}`);
      if (!patient.id) {
        console.error('ERROR: Falta el ID del paciente para actualizar');
        Alert.alert('Error', 'No se puede actualizar el paciente: ID no encontrado');
        setLoading(false);
        return;
      }
    }
    
    // Preparar los datos para enviar
    const dataToSend = {
      nombre: formData.nombre,
      apellidos: formData.apellidos,
      telefono: formData.telefono,
      direccion: formData.direccion || '',
      correo: formData.email || '',
      fecha_registro: new Date().toISOString().split('T')[0]
    };
    
    // Si estamos sin conexión, guardar localmente
    if (!isConnected) {
      await saveOfflineData({
        id: isEditing ? patient.id : `temp_${new Date().getTime()}`,
        data: dataToSend,
        method,
        url: apiUrl,
        isSync: false,
        timestamp: new Date().getTime()
      });
      
      setLoading(false);
      Alert.alert(
        'Modo sin conexión',
        'Los datos se han guardado localmente y se sincronizarán cuando haya conexión a internet.',
        [{ 
          text: 'OK', 
          onPress: () => {
            if (typeof refresh === 'function') {
              refresh();
            }
            navigation.goBack();
          }
        }]
      );
      return;
    }
    
    console.log(`Enviando solicitud ${method.toUpperCase()} a ${apiUrl}`);
    console.log('Datos enviados:', JSON.stringify(dataToSend, null, 2));
    console.log('Headers:', JSON.stringify(axios.defaults.headers.common, null, 2));
    
    const config = {};
    if (method === 'put') {
      config.headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-HTTP-Method-Override': 'PUT'
      };
    }
    
    axios({
      method,
      url: apiUrl,
      data: dataToSend,
      ...config
    })
      .then(response => {
        console.log('Respuesta completa:', JSON.stringify(response, null, 2));
        console.log('Datos de respuesta:', JSON.stringify(response.data, null, 2));
        
        setLoading(false);
        
        if (response.data && response.data.status === 'success') {
          handleSuccessResponse();
        } else if (response.status >= 200 && response.status < 300) {
          console.log('Operación exitosa basada en código HTTP:', response.status);
          handleSuccessResponse();
        } else {
          console.error('Formato de respuesta inesperado:', response.data);
          Alert.alert('Error', 'Formato de respuesta inesperado del servidor');
        }
      })
      .catch(async error => {
        console.error('Error en la solicitud:', error);
        
        // Si el error es de red, intentamos guardar localmente
        if (error.message.includes('Network Error') || !isConnected) {
          await saveOfflineData({
            id: isEditing ? patient.id : `temp_${new Date().getTime()}`,
            data: dataToSend,
            method,
            url: apiUrl,
            isSync: false,
            timestamp: new Date().getTime()
          });
          
          setLoading(false);
          Alert.alert(
            'Sin conexión',
            'No hay conexión a internet. Los datos se han guardado localmente y se sincronizarán cuando haya conexión.',
            [{ 
              text: 'OK', 
              onPress: () => {
                if (typeof refresh === 'function') {
                  refresh();
                }
                navigation.goBack();
              }
            }]
          );
        } else {
          setLoading(false);
          handleErrorResponse(error);
        }
      });
  };
  
  // Función para guardar datos offline
  const saveOfflineData = async (offlineData) => {
    try {
      // Obtener datos existentes
      const existingDataJson = await AsyncStorage.getItem('offlinePacientes');
      let offlineQueue = existingDataJson ? JSON.parse(existingDataJson) : [];
      
      // Si estamos editando, eliminar entradas anteriores con el mismo ID
      if (isEditing) {
        offlineQueue = offlineQueue.filter(item => item.id !== offlineData.id);
      }
      
      // Agregar nueva entrada
      offlineQueue.push(offlineData);
      
      // Guardar de vuelta en AsyncStorage
      await AsyncStorage.setItem('offlinePacientes', JSON.stringify(offlineQueue));
      console.log('Datos guardados offline correctamente');
      
      // También almacenar localmente para acceso rápido
      const localPacientes = await AsyncStorage.getItem('localPacientes');
      let pacientes = localPacientes ? JSON.parse(localPacientes) : [];
      
      if (isEditing) {
        // Actualizar paciente existente
        pacientes = pacientes.map(p => 
          p.id === offlineData.id ? {...p, ...offlineData.data} : p
        );
      } else {
        // Agregar nuevo paciente
        pacientes.push({
          id: offlineData.id,
          ...offlineData.data
        });
      }
      
      await AsyncStorage.setItem('localPacientes', JSON.stringify(pacientes));
      
    } catch (error) {
      console.error('Error al guardar datos offline:', error);
    }
  };
  
  // Función para sincronizar datos cuando hay conexión
  const syncOfflineData = async () => {
    if (!isConnected) return;
    
    try {
      const offlineDataJson = await AsyncStorage.getItem('offlinePacientes');
      if (!offlineDataJson) return;
      
      const offlineQueue = JSON.parse(offlineDataJson);
      if (offlineQueue.length === 0) return;
      
      // Procesar cada entrada pendiente
      for (const item of offlineQueue) {
        if (item.isSync) continue;
        
        try {
          await axios({
            method: item.method,
            url: item.url,
            data: item.data,
            headers: item.method === 'put' ? {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-HTTP-Method-Override': 'PUT'
            } : undefined
          });
          
          // Marcar como sincronizado
          item.isSync = true;
        } catch (error) {
          console.error('Error al sincronizar elemento:', error);
        }
      }
      
      // Guardar el estado actualizado
      const updatedQueue = offlineQueue.filter(item => !item.isSync);
      await AsyncStorage.setItem('offlinePacientes', JSON.stringify(updatedQueue));
      
    } catch (error) {
      console.error('Error en sincronización:', error);
    }
  };
  
  // Intentar sincronizar cuando hay conexión
  useEffect(() => {
    if (isConnected) {
      syncOfflineData();
    }
  }, [isConnected]);
  
  const handleSuccessResponse = () => {
    console.log(isEditing ? 'Paciente actualizado correctamente' : 'Paciente creado correctamente');
    
    Alert.alert(
      'Éxito', 
      isEditing ? 'Paciente actualizado correctamente' : 'Paciente creado correctamente',
      [{ 
        text: 'OK', 
        onPress: () => {
          if (typeof refresh === 'function') {
            refresh();
          }
          navigation.goBack();
        }
      }]
    );
  };
  
  const handleErrorResponse = (error) => {
    if (error.response?.data?.errors) {
      console.log('Errores de validación:', error.response.data.errors);
      const errorMessages = Object.entries(error.response.data.errors)
        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
        .join('\n');
      
      console.log('Campos con problemas:', Object.keys(error.response.data.errors).join(', '));
      
      Alert.alert('Error de validación', errorMessages);
    } else if (error.response?.status === 422) {
      console.log('Error de validación 422:', error.response.data);
      const message = error.response.data.message || 'Error de validación en los datos enviados';
      Alert.alert('Error de validación', message);
    } else if (error.response?.status === 401) {
      Alert.alert(
        'Sesión expirada', 
        'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } else if (error.response?.status === 403) {
      Alert.alert('Error de permisos', 'No tienes permisos para realizar esta acción');
    } else if (error.response?.status === 404) {
      Alert.alert('Error', 'El recurso solicitado no existe');
    } else if (error.response?.status === 500) {
      Alert.alert('Error del servidor', 'Ocurrió un error interno en el servidor');
    } else if (error.response) {
      let errorMessage = `Error ${error.response.status}: `;
      if (error.response.data && error.response.data.message) {
        errorMessage += error.response.data.message;
      } else {
        errorMessage += 'Hubo un problema con la solicitud';
      }
      
      Alert.alert('Error', errorMessage);
    } else if (error.request) {
      console.log('No se recibió respuesta del servidor:', error.request);
      Alert.alert('Error de conexión', 'No se recibió respuesta del servidor. Verifica tu conexión a internet.');
    } else {
      console.log('Error inesperado:', error.message);
      Alert.alert('Error', `Hubo un problema al conectar con el servidor: ${error.message}`);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
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
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
          </Text>
          <View style={{ width: 40 }}></View>
        </View>
      </LinearGradient>

      {!isConnected && (
        <View style={styles.offlineNotice}>
          <Ionicons name="cloud-offline" size={20} color="#fff" />
          <Text style={styles.offlineText}>Modo sin conexión</Text>
        </View>
      )}

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre*</Text>
          <TextInput
            style={styles.input}
            value={formData.nombre}
            onChangeText={(value) => handleChange('nombre', value)}
            placeholder="Nombre del paciente"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Apellidos*</Text>
          <TextInput
            style={styles.input}
            value={formData.apellidos}
            onChangeText={(value) => handleChange('apellidos', value)}
            placeholder="Apellidos del paciente"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Teléfono*</Text>
          <TextInput
            style={styles.input}
            value={formData.telefono}
            onChangeText={(value) => handleChange('telefono', value)}
            placeholder="Número de teléfono"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
            placeholder="Correo electrónico"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dirección</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={formData.direccion}
            onChangeText={(value) => handleChange('direccion', value)}
            placeholder="Dirección completa"
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? 'Actualizar Paciente' : 'Guardar Paciente'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#21588E',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  offlineNotice: {
    backgroundColor: '#E74C3C',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
