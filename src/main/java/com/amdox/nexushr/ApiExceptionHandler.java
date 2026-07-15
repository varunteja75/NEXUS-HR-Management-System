package com.amdox.nexushr;
import org.springframework.http.*; import org.springframework.web.bind.annotation.*; import java.util.Map; import java.util.NoSuchElementException;
@RestControllerAdvice class ApiExceptionHandler { @ExceptionHandler(NoSuchElementException.class) ResponseEntity<Map<String,String>> missing(NoSuchElementException e){return ResponseEntity.status(404).body(Map.of("message",e.getMessage()));} }
