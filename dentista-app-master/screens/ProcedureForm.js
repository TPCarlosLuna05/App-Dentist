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
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';

export default function ProcedureForm() {
  const navigation = useNavigation();
  const route = useRoute();
  const { procedure, refresh } = route.params || {};
  const isEditing = !!procedure;
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  });

  useEffect(() => {
    if (isEditing && procedure) {
      setFormData({
        nombre: procedure.nombre || '',
        descripcion: procedure.descripcion || '',
      });
    }
  }, [isEditing, procedure]);

  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const validateForm = () => {
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre del procedimiento es obligatorio');
      return false;
    }
    
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    setLoading(true);
    const apiUrl = isEditing 
      ? `https://dentist-app-0fcf42a43c96.herokuapp.com/api/procedimientos/${procedure.id}`
      : 'https://dentist-app-0fcf42a43c96.herokuapp.com/api/procedimientos';
    
    const method = isEditing ? 'put' : 'post';
    
    if (isEditing && !procedure.id) {
      console.error('ERROR: Falta el ID del procedimiento para actualizar');
      Alert.alert('Error', 'No se puede actualizar el procedimiento: ID no encontrado');
      setLoading(false);
      return;
    }

    // Datos a enviar al servidor
    const dataToSend = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || '',
    };
    
    // Para depuración
    console.log(`Enviando solicitud ${method.toUpperCase()} a ${apiUrl}`);
    console.log('Datos enviados:', JSON.stringify(dataToSend, null, 2));
    
    // Configuración específica para métodos PUT
    const config = {};
    if (method === 'put') {
      // Algunos servidores Laravel requieren estos headers para PUT
      config.headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    }
    
    axios({
      method,
      url: apiUrl,
      data: dataToSend,
      ...config
    })
      .then(response => {
        console.log('Respuesta recibida:', JSON.stringify(response.data, null, 2));
        
        setLoading(false);
        
        // Verificar el tipo de respuesta
        if (response.status >= 200 && response.status < 300) {
          handleSuccessResponse();
        } else {
          console.error('Formato de respuesta inesperado:', response.data);
          Alert.alert('Error', 'Formato de respuesta inesperado del servidor');
        }
      })
      .catch(error => {
        setLoading(false);
        
        // Registro detallado del error
        const errorDetails = {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        };
        
        console.error('Error al guardar procedimiento:', JSON.stringify(errorDetails, null, 2));
        
        // Manejar diferentes tipos de errores
        handleErrorResponse(error);
      });
  };
  
  // Función para manejar respuestas exitosas
  const handleSuccessResponse = () => {
    const message = isEditing 
      ? 'Procedimiento actualizado correctamente' 
      : 'Procedimiento creado correctamente';
    
    console.log(message);
    
    Alert.alert(
      'Éxito', 
      message,
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
  
  // Función para manejar errores
  const handleErrorResponse = (error) => {
    if (error.response?.data?.errors) {
      // Errores de validación Laravel
      console.log('Errores de validación:', error.response.data.errors);
      const errorMessages = Object.entries(error.response.data.errors)
        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
        .join('\n');
      
      console.log('Campos con problemas:', Object.keys(error.response.data.errors).join(', '));
      
      Alert.alert('Error de validación', errorMessages);
    } else if (error.response?.status === 422) {
      // Error de validación sin formato estándar
      console.log('Error de validación 422:', error.response.data);
      const message = error.response.data.message || 'Error de validación en los datos enviados';
      Alert.alert('Error de validación', message);
    } else if (error.response?.status === 401) {
      // Error de autenticación
      Alert.alert(
        'Sesión expirada', 
        'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } else if (error.response?.status === 403) {
      // Error de permisos
      Alert.alert('Error de permisos', 'No tienes permisos para realizar esta acción');
    } else if (error.response) {
      // Otros errores con respuesta del servidor
      let errorMessage = `Error ${error.response.status}: `;
      if (error.response.data && error.response.data.message) {
        errorMessage += error.response.data.message;
      } else {
        errorMessage += 'Hubo un problema con la solicitud';
      }
      
      Alert.alert('Error', errorMessage);
    } else if (error.request) {
      // La solicitud fue realizada pero no se recibió respuesta
      console.log('No se recibió respuesta del servidor:', error.request);
      Alert.alert('Error de conexión', 'No se recibió respuesta del servidor. Verifica tu conexión a internet.');
    } else {
      // Otro tipo de error
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
            {isEditing ? 'Editar Procedimiento' : 'Nuevo Procedimiento'}
          </Text>
          <View style={{ width: 40 }}></View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre del Procedimiento*</Text>
          <TextInput
            style={styles.input}
            value={formData.nombre}
            onChangeText={(value) => handleChange('nombre', value)}
            placeholder="Ej. Limpieza dental, Extracción, etc."
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={formData.descripcion}
            onChangeText={(value) => handleChange('descripcion', value)}
            placeholder="Descripción detallada del procedimiento"
            multiline
            numberOfLines={5}
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
              {isEditing ? 'Actualizar Procedimiento' : 'Guardar Procedimiento'}
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
    height: 120,
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
});
