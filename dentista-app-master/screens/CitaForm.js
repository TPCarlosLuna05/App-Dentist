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
  Platform,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';

export default function CitaForm() {
  const navigation = useNavigation();
  const route = useRoute();
  const { cita, isEditing, doctorPreseleccionado } = route.params || {};

  // Determinar origen para la navegación de retorno
  const origen = route.params?.origen || (doctorPreseleccionado ? 'CitasDocs' : 'ConsultasScreen');

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [formData, setFormData] = useState({
    id_paciente: '',
    id_doctor: '',
    descripcion_manual: '',
    observaciones: '',
    estado: isEditing ? (cita?.estado || 'pendiente') : 'pendiente', // Estado oculto, pero se mantiene en el formData
    fecha: new Date(),
    hora: new Date(),
    servicios: []
  });

  // Data para los pickers
  const [pacientes, setPacientes] = useState([]);
  const [doctores, setDoctores] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [mostrarModalServicios, setMostrarModalServicios] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState(null);
  const [cantidadServicio, setCantidadServicio] = useState(1);

  // Estados para selección de fecha y hora
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      setPageLoading(true);
      try {
        // Cargar datos para los select
        await Promise.all([
          loadPacientes(),
          loadDoctores(),
          loadServicios()
        ]);

        // Si estamos editando, cargar los datos de la cita
        if (isEditing && cita) {
          let citaData = { ...cita };
          
          // Convertir las fechas a objetos Date
          if (citaData.fecha) {
            citaData.fecha = new Date(citaData.fecha);
          }
          
          if (citaData.hora) {
            // Si hora es un string con formato HH:MM:SS, convertirlo a Date
            if (typeof citaData.hora === 'string' && citaData.hora.includes(':')) {
              const [hours, minutes] = citaData.hora.split(':');
              const horaDate = new Date();
              horaDate.setHours(parseInt(hours, 10));
              horaDate.setMinutes(parseInt(minutes, 10));
              citaData.hora = horaDate;
            } else {
              citaData.hora = new Date(citaData.hora);
            }
          }
          
          // Extraer servicios si existen
          if (citaData.serviciosDirectos && citaData.serviciosDirectos.length > 0) {
            // Transformar al formato de servicios que usamos internamente
            citaData.servicios = citaData.serviciosDirectos.map(servicio => ({
              id: servicio.id,
              nombre: servicio.nombre,
              precio: servicio.precio,
              cantidad: servicio.pivot ? servicio.pivot.cantidad : 1
            }));
          } else {
            citaData.servicios = [];
          }
          
          setFormData(citaData);
        } 
        // Si viene de CitasDocs, preseleccionar el doctor
        else if (doctorPreseleccionado) {
          setFormData(prevState => ({
            ...prevState,
            id_doctor: doctorPreseleccionado
          }));
        }
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        Alert.alert('Error', 'Hubo un problema al cargar los datos iniciales');
      } finally {
        setPageLoading(false);
      }
    };

    loadInitialData();
  }, [isEditing, cita, doctorPreseleccionado]);

  // Cargar lista de pacientes
  const loadPacientes = async () => {
    try {
      const response = await api.get('/pacientes');
      
      if (response.success && response.data) {
        setPacientes(response.data || []);
      } else {
        console.error('Error cargando pacientes:', response);
      }
    } catch (error) {
      console.error('Error cargando pacientes:', error);
    }
  };

  // Cargar lista de doctores
  const loadDoctores = async () => {
    try {
      const response = await api.get('/doctores');
      
      if (response.success && response.data) {
        setDoctores(response.data || []);
      } else {
        console.error('Error cargando doctores:', response);
      }
    } catch (error) {
      console.error('Error cargando doctores:', error);
    }
  };

  // Cargar lista de servicios
  const loadServicios = async () => {
    try {
      const response = await api.getAllServicios();
      
      if (response.success && response.data) {
        setServicios(response.data || []);
      } else {
        console.error('Error cargando servicios:', response);
      }
    } catch (error) {
      console.error('Error cargando servicios:', error);
    }
  };

  // Manejar cambios en el formulario
  const handleChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Manejar cambio de fecha
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleChange('fecha', selectedDate);
    }
  };

  // Manejar cambio de hora
  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      handleChange('hora', selectedTime);
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('es-ES');
  };

  // Formatear hora para mostrar
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };
  // Validar el formulario antes de enviar
  const validateForm = () => {
    const errors = [];

    if (!formData.id_paciente) {
      errors.push('Debe seleccionar un paciente');
    } else if (isNaN(parseInt(formData.id_paciente))) {
      errors.push('El ID del paciente no es válido');
    }
    
    if (!formData.id_doctor) {
      errors.push('Debe seleccionar un doctor');
    } else if (isNaN(parseInt(formData.id_doctor))) {
      errors.push('El ID del doctor no es válido');
    }
    
    if (!formData.servicios.length && !formData.descripcion_manual) {
      errors.push('Debe seleccionar al menos un servicio o ingresar una descripción');
    }
    
    if (!formData.fecha) {
      errors.push('Debe seleccionar una fecha');
    }
    
    if (!formData.hora) {
      errors.push('Debe seleccionar una hora');
    }
    
    if (errors.length > 0) {
      Alert.alert('Campos incompletos', errors.join('\n'));
      return false;
    }
    
    return true;
  };

  // Verificar disponibilidad de horario
  const verificarDisponibilidad = async (fecha, hora, doctorId) => {
    try {
      // Obtener las citas del doctor para esa fecha
      const response = await api.get(`/citas-por-doctor/${doctorId}?fecha=${fecha}`);
      
      if (response.success) {
        // Verificar si hay alguna cita en el mismo horario
        let citasDelDia = [];
        
        // Extraer las citas del día correctamente, manejando diferentes estructuras de respuesta
        if (Array.isArray(response.data)) {
          citasDelDia = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          citasDelDia = response.data.data;
        }
        
        // Si no hay citas para ese día, no hay conflictos
        if (!citasDelDia || citasDelDia.length === 0) {
          return true;
        }
        
        // Formatear la hora para comparación
        const horaFormateada = hora.getHours().toString().padStart(2, '0') + ':' + 
                             hora.getMinutes().toString().padStart(2, '0');
        
        // Buscar conflicto de horario
        const citaExistente = citasDelDia.find(cita => {
          // Si estamos editando, ignorar la cita actual
          if (isEditing && cita.id === route.params.cita.id) return false;
          
          // Comparar la hora de la cita
          return cita.hora === horaFormateada;
        });

        if (citaExistente) {
          Alert.alert(
            'Horario no disponible',
            'Ya existe una cita programada para esta hora. Por favor seleccione otro horario.'
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error al verificar disponibilidad:', error);
      Alert.alert('Error', 'No se pudo verificar la disponibilidad del horario');
      return false;
    }
  };

  // Agregar un servicio a la cita
  const agregarServicio = () => {
    if (!selectedServicio) {
      Alert.alert('Error', 'Debe seleccionar un servicio');
      return;
    }

    if (cantidadServicio <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor a 0');
      return;
    }

    // Verificar si el servicio ya está agregado
    const servicioExistente = formData.servicios.find(s => s.id === selectedServicio.id);

    if (servicioExistente) {
      // Actualizar la cantidad del servicio existente
      const serviciosActualizados = formData.servicios.map(s => 
        s.id === selectedServicio.id 
          ? { ...s, cantidad: s.cantidad + cantidadServicio } 
          : s
      );
      setFormData({
        ...formData,
        servicios: serviciosActualizados
      });
    } else {
      // Agregar el nuevo servicio
      setFormData({
        ...formData,
        servicios: [
          ...formData.servicios,
          {
            ...selectedServicio,
            cantidad: cantidadServicio
          }
        ]
      });
    }

    // Resetear el estado de la selección
    setSelectedServicio(null);
    setCantidadServicio(1);
    setMostrarModalServicios(false);
  };

  // Eliminar servicio de la cita
  const eliminarServicio = (id) => {
    const serviciosActualizados = formData.servicios.filter(s => s.id !== id);
    setFormData({
      ...formData,
      servicios: serviciosActualizados
    });
  };

  // Calcular el total de la cita
  const calcularTotal = () => {
    return formData.servicios.reduce((total, servicio) => {
      return total + (servicio.precio * servicio.cantidad);
    }, 0);
  };

  // Modal para seleccionar servicios
  const renderModalServicios = () => {
    return (
      <Modal
        visible={mostrarModalServicios}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMostrarModalServicios(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Servicio</Text>
            
            {/* Lista de servicios */}
            <FlatList
              data={servicios}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.servicioItem,
                    selectedServicio?.id === item.id && styles.servicioSeleccionado
                  ]}
                  onPress={() => setSelectedServicio(item)}
                >
                  <View style={styles.servicioInfo}>
                    <Text style={styles.servicioNombre}>{item.nombre}</Text>
                    <Text style={styles.servicioPrecio}>${item.precio}</Text>
                  </View>
                  {selectedServicio?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#21588E" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyMessage}>No hay servicios disponibles</Text>
              }
            />
            
            {/* Control de cantidad */}
            {selectedServicio && (
              <View style={styles.cantidadContainer}>
                <Text style={styles.cantidadLabel}>Cantidad:</Text>
                <View style={styles.cantidadControls}>
                  <TouchableOpacity
                    style={styles.cantidadButton}
                    onPress={() => setCantidadServicio(Math.max(1, cantidadServicio - 1))}
                  >
                    <Ionicons name="remove" size={24} color="#21588E" />
                  </TouchableOpacity>
                  <Text style={styles.cantidadText}>{cantidadServicio}</Text>
                  <TouchableOpacity
                    style={styles.cantidadButton}
                    onPress={() => setCantidadServicio(cantidadServicio + 1)}
                  >
                    <Ionicons name="add" size={24} color="#21588E" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Botones de acción */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => {
                  setSelectedServicio(null);
                  setCantidadServicio(1);
                  setMostrarModalServicios(false);
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addModalButton,
                  !selectedServicio && styles.disabledButton
                ]}
                disabled={!selectedServicio}
                onPress={agregarServicio}              >
                <Text style={styles.addModalButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Enviar formulario
  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Formatear fecha para la validación
    const fechaFormateada = formData.fecha.toISOString().split('T')[0];

    // Verificar disponibilidad antes de continuar
    const horarioDisponible = await verificarDisponibilidad(
      fechaFormateada,
      formData.hora,
      formData.id_doctor
    );

    if (!horarioDisponible) return;
    
    try {
      setLoading(true);
      console.log('Enviando formulario de cita...');
      
      // Formatear la hora correctamente en formato de 24 horas (HH:MM)
      const horaFormateada = formData.hora.getHours().toString().padStart(2, '0') + ':' + 
                            formData.hora.getMinutes().toString().padStart(2, '0');
        // Asegurarse de que los campos ID sean válidos
      const pacienteId = parseInt(formData.id_paciente);
      const doctorId = parseInt(formData.id_doctor);
      
      if (isNaN(pacienteId) || isNaN(doctorId)) {
        Alert.alert('Error', 'Los IDs de paciente y doctor deben ser valores numéricos válidos');
        setLoading(false);
        return;
      }
      
      // Preparar los datos para el envío
      const dataToSend = {
        id_paciente: pacienteId.toString(), // API espera string
        id_doctor: doctorId.toString(), // API espera string
        fecha: fechaFormateada,
        hora: horaFormateada,
        estado: isEditing ? formData.estado : 'pendiente', // Usar el estado existente si es edición, o "pendiente" si es nuevo
        observaciones: formData.observaciones ? formData.observaciones.trim() : '',
      };
      
      // Agregar descripción manual solo si está presente y no hay servicios
      if (!formData.servicios.length && formData.descripcion_manual && formData.descripcion_manual.trim() !== '') {
        dataToSend.descripcion_manual = formData.descripcion_manual.trim();
      }
      
      // Agregar servicios si hay servicios seleccionados
      if (formData.servicios && formData.servicios.length > 0) {
        dataToSend.servicios = formData.servicios.map(servicio => ({
          id: servicio.id,
          cantidad: servicio.cantidad
        }));
      }
      
      console.log('Datos a enviar:', JSON.stringify(dataToSend, null, 2));
      
      let response;
      let responseData;
      
      if (isEditing) {
        response = await api.put(`/citas/${cita.id}`, dataToSend);
        console.log('Respuesta de actualización:', JSON.stringify(response, null, 2));
        responseData = response;
      } else {
        // Si hay servicios, usamos el endpoint citas-por-servicio para el primero
        if (formData.servicios.length > 0) {
          // Tomamos el primer servicio como principal
          const primerServicio = formData.servicios[0];
          
          // Validamos que el servicio tenga un ID válido
          if (!primerServicio.id) {
            Alert.alert('Error', 'El servicio seleccionado no tiene un ID válido');
            setLoading(false);
            return;
          }
          
          const servicioId = parseInt(primerServicio.id);
          if (isNaN(servicioId)) {
            Alert.alert('Error', 'El ID del servicio no es válido');
            setLoading(false);
            return;
          }
          
          const servicioData = {
            id_paciente: dataToSend.id_paciente, // Ya validado anteriormente
            id_doctor: dataToSend.id_doctor,
            id_servicio: servicioId.toString(), // Nos aseguramos de enviar el id como string
            cantidad: primerServicio.cantidad,
            fecha: dataToSend.fecha,
            hora: dataToSend.hora,
            observaciones: dataToSend.observaciones,
            estado: 'pendiente', // Siempre "pendiente" para nuevas citas
            // Si hay más servicios, los incluimos también
            servicios: formData.servicios.length > 1 ? 
              formData.servicios.slice(1).map(servicio => ({
                id: servicio.id.toString(), // Nos aseguramos de enviar los ids como string
                cantidad: servicio.cantidad
              })) : []
          };
          
          console.log('Datos de cita por servicio a enviar:', JSON.stringify(servicioData, null, 2));
          
          response = await api.post('/citas-por-servicio', servicioData);
        } else {
          response = await api.post('/citas', dataToSend);
        }
        console.log('Respuesta de creación:', JSON.stringify(response, null, 2));
        responseData = response;
      }
      
      if (response.success) {
        // Obtener detalles completos de la cita recién creada o actualizada
        const citaId = responseData.data?.id || cita?.id;
        
        // Extraer la cita completa considerando la estructura anidada de la respuesta
        let citaCompleta;
        
        // Manejar la estructura anidada de la respuesta
        if (responseData.data?.data) {
          // Caso donde tenemos data.data (estructura doblemente anidada)
          citaCompleta = responseData.data.data;
        } else if (responseData.data) {
          // Caso donde tenemos solo data
          citaCompleta = responseData.data;
        } else {
          // Fallback
          citaCompleta = isEditing ? {...cita, ...dataToSend} : dataToSend;
        }
        
        // Extraer la URL de confirmación de la estructura correcta
        // La URL puede estar en confirmation_url dentro de data.data o directamente en data
        const confirmationUrl = responseData.data?.confirmation_url || responseData?.confirmation_url;
        
        console.log("URL de confirmación extraída:", confirmationUrl);
        
        // Si estamos editando, mostramos mensaje de éxito y volvemos
        if (isEditing) {
          Alert.alert('Éxito', response.message || 'Cita actualizada correctamente', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        } else {
          // Si es una nueva cita, navegamos a la pantalla de confirmación con los datos correctos
          navigation.replace('ConfirmacionCita', {
            cita: citaCompleta,
            confirmationUrl,
            origen
          });
        }
      } else {
        console.error('Error al guardar cita:', response);
        Alert.alert('Error', response.message || 'No se pudo guardar la cita');
      }
    } catch (error) {
      console.error('Error al guardar cita:', error);
      let errorMessage = 'Hubo un problema al guardar la cita.';
      
      if (error.response?.data?.errors) {
        // Mostrar errores de validación detallados
        const errorsArray = Object.entries(error.response.data.errors)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('\n');
        errorMessage = `Errores de validación:\n${errorsArray}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#21588E" />
        <Text style={styles.loadingText}>Cargando formulario...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
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
            {isEditing ? 'Editar Cita' : 'Nueva Cita'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {renderModalServicios()}

      <ScrollView style={styles.formContainer}>
        {/* Selección de Paciente */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Paciente*</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.id_paciente}
              style={styles.picker}
              onValueChange={(value) => handleChange('id_paciente', value)}
            >
              <Picker.Item label="Seleccionar paciente" value="" />
              {pacientes.map(paciente => (
                <Picker.Item 
                  key={paciente.id} 
                  label={`${paciente.nombre} ${paciente.apellidos || ''}`} 
                  value={paciente.id} 
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Selección de Doctor */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Doctor*</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.id_doctor}
              style={[styles.picker, doctorPreseleccionado ? styles.disabledPicker : {}]}
              onValueChange={(value) => handleChange('id_doctor', value)}
              enabled={!doctorPreseleccionado} // Deshabilitar si viene preseleccionado
            >
              <Picker.Item label="Seleccionar doctor" value="" />
              {doctores.map(doctor => (
                <Picker.Item 
                  key={doctor.id} 
                  label={doctor.nombre} 
                  value={doctor.id} 
                />
              ))}
            </Picker>
          </View>
          {doctorPreseleccionado && (
            <Text style={styles.preselectedNote}>Doctor asignado automáticamente</Text>
          )}
        </View>

        {/* Servicios seleccionados */}
        <View style={styles.formGroup}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Servicios*</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setMostrarModalServicios(true)}
            >
              <Ionicons name="add" size={24} color="#21588E" />
              <Text style={styles.addButtonText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          {formData.servicios.length > 0 ? (
            <View style={styles.serviciosListContainer}>
              {formData.servicios.map((servicio, index) => (
                <View key={index} style={styles.servicioCard}>
                  <View style={styles.servicioCardContent}>
                    <Text style={styles.servicioCardName}>{servicio.nombre}</Text>
                    <Text style={styles.servicioCardDetails}>
                      {servicio.cantidad} x ${servicio.precio} = ${servicio.cantidad * servicio.precio}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteServiceButton}
                    onPress={() => eliminarServicio(servicio.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#f44336" />
                  </TouchableOpacity>
                </View>
              ))}
              
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>${calcularTotal().toFixed(2)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyServicesContainer}>
              <Text style={styles.emptyServicesText}>
                No hay servicios seleccionados
              </Text>
            </View>
          )}
        </View>

        {/* Descripción Manual (solo si no hay servicios) */}
        {formData.servicios.length === 0 && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Descripción (si no selecciona servicios)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingrese una descripción de la cita"
              value={formData.descripcion_manual}
              onChangeText={(value) => handleChange('descripcion_manual', value)}
            />
          </View>
        )}

        {/* Observaciones */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Observaciones</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ingrese observaciones adicionales"
            value={formData.observaciones}
            onChangeText={(value) => handleChange('observaciones', value)}
            multiline={true}
            numberOfLines={4}
          />
        </View>

        {/* Se eliminó el selector de Estado de la cita */}

        {/* Fecha */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Fecha*</Text>
          <TouchableOpacity 
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateTimeText}>
              {formData.fecha ? formatDate(formData.fecha) : 'Seleccionar fecha'}
            </Text>
            <Ionicons name="calendar" size={24} color="#21588E" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={formData.fecha || new Date()}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Hora */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Hora*</Text>
          <TouchableOpacity 
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.dateTimeText}>
              {formData.hora ? formatTime(formData.hora) : 'Seleccionar hora'}
            </Text>
            <Ionicons name="time" size={24} color="#21588E" />
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={formData.hora || new Date()}
              mode="time"
              display="default"
              onChange={onTimeChange}
              is24Hour={true}
            />
          )}
        </View>

        {/* Botón de Guardar */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Actualizar Cita' : 'Guardar Cita'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Botón de Cancelar */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  disabledPicker: {
    backgroundColor: '#e0e0e0',
  },
  preselectedNote: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
  dateTimeButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#21588E',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 30,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 18,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    color: '#21588E',
    marginLeft: 5,
  },
  serviciosListContainer: {
    marginTop: 10,
  },
  servicioCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  servicioCardContent: {
    flex: 1,
  },
  servicioCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  servicioCardDetails: {
    fontSize: 14,
    color: '#666',
  },
  deleteServiceButton: {
    marginLeft: 10,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#21588E',
  },
  emptyServicesContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  emptyServicesText: {
    fontSize: 14,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  servicioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  servicioSeleccionado: {
    backgroundColor: '#e0f7fa',
  },
  servicioInfo: {
    flex: 1,
  },
  servicioNombre: {
    fontSize: 16,
    color: '#333',
  },
  servicioPrecio: {
    fontSize: 14,
    color: '#666',
  },
  emptyMessage: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  cantidadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  cantidadLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  cantidadControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cantidadButton: {
    padding: 5,
  },
  cantidadText: {
    fontSize: 16,
    color: '#333',
    marginHorizontal: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelModalButton: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    fontSize: 16,
    color: '#666',
  },
  addModalButton: {
    backgroundColor: '#21588E',
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  addModalButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#ddd',
  },
});
